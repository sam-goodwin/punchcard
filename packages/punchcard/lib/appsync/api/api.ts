import type * as appsync from '@aws-cdk/aws-appsync';

import { isOptional, Meta, Shape, ShapeGuards, UnionShape } from '@punchcard/shape';
import { RecordShape } from '@punchcard/shape/lib/record';
import { UserPool } from '../../cognito/user-pool';
import { Build } from '../../core/build';
import { CDK } from '../../core/cdk';
import { Construct, Scope } from '../../core/construct';
import { Resource } from '../../core/resource';
import { Subscriptions, toAuthDirectives } from '../lang';
import { VExpression } from '../lang/expression';
import { stash, StatementGuards } from '../lang/statement';
import { VNothing, VObject, VObjectExpr, VUnion } from '../lang/vtl-object';
import { ApiFragment } from './api-fragment';
import { AuthMetadata } from './auth';
import { CacheMetadata, FullRequestCachingConfiguration, isPerResolverCachingConfiguration, PerResolverCachingConfiguration } from './caching';
import { InterpreterState, interpretProgram, parseIf } from './interpreter';
import { FieldResolver } from './resolver';
import { MutationRoot, QueryRoot, SubscriptionRoot } from './root';
import { SubscribeMetadata } from './subscription';
import { TypeSpec, TypeSystem } from './type-system';

export interface OverrideApiProps extends Omit<appsync.GraphQLApiProps,
  | 'name'
  | 'schemaDefinition'
  | 'schemaDefinitionFile'
> {}

export interface ApiProps<
  T extends TypeSystem
> {
  readonly name: string;
  readonly userPool: UserPool<any, any>;
  readonly types: ApiFragment<T>;
  readonly caching?: PerResolverCachingConfiguration<T> | FullRequestCachingConfiguration;
  readonly subscribe?: {
    [subscriptionName in keyof T[SubscriptionRoot.FQN]['resolvers']]?: Subscriptions<T[SubscriptionRoot.FQN]['type']>[];
  };
  readonly overrideProps?: Build<OverrideApiProps>;
}

/**
 * A finalized AppSync-managed GraphQL API.
 *
 * APIs are constructed by combining `ApiFragments`.
 *
 * @typeparam Types - map of names to types in this API
 */
export class Api<
  T extends TypeSystem,
  Q extends keyof T,
  M extends keyof T,
  S extends keyof T,
> extends Construct implements Resource<appsync.CfnGraphQLApi> {
  public readonly resource: Build<appsync.CfnGraphQLApi>;

  public readonly Types: {
    // eumerate through to clean up the type siganture ("Compaction").
    [t in keyof T]: {
      [k in keyof T[t]]: T[t][k]
    };
  };
  public readonly QueryFQN: Q;
  public readonly QuerySpec: Q extends keyof T ? T[Q] : undefined;
  public readonly MutationFQN: M;
  public readonly MutationSpec: M extends keyof T ? T[M] : undefined;
  public readonly SubscriptionFQN: S;
  public readonly SubscriptionSpec: S extends keyof T ? T[S] : undefined;

  constructor(scope: Scope, id: string, props: ApiProps<T>) {
    super(scope, id);
    this.Types = props.types.Types;

    this.QueryFQN = QueryRoot.FQN as Q;
    this.QuerySpec = this.Types[this.QueryFQN] as any;
    this.MutationFQN = MutationRoot.FQN as M;
    this.MutationSpec = this.Types[this.MutationFQN] as any;
    this.SubscriptionFQN = SubscriptionRoot.FQN as S;
    this.SubscriptionSpec = this.Types[this.SubscriptionFQN] as any;

    this.resource = Build.concat(
      CDK,
      Scope.resolve(scope),
      props.overrideProps || Build.of({})
    ).map(([{appsync, core, iam}, scope, buildProps]) => {
      const blocks: string[] = [];

      scope = new core.Construct(scope, id);

      const cwRole = new iam.Role(scope, 'CloudWatchRole', {
        assumedBy: new iam.ServicePrincipal('appsync')
      });
      cwRole.addToPolicy(new iam.PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogStreams'
        ],
        resources: [
          'arn:aws:logs:*:*:*'
        ]
      }));
      const api = new appsync.CfnGraphQLApi(scope, 'Api', {
        name: props.name,
        authenticationType: 'AWS_IAM',
        logConfig: {
          cloudWatchLogsRoleArn: cwRole.roleArn,
          fieldLogLevel: 'ALL',
        },
        ...buildProps
      });
      const apiCache: appsync.CfnApiCache | undefined = props.caching ? new appsync.CfnApiCache(scope, 'ApiCache', {
        apiId: api.attrApiId,
        apiCachingBehavior: props.caching.behavior,
        atRestEncryptionEnabled: props.caching.atRestEncryptionEnabled,
        transitEncryptionEnabled: props.caching.transitEncryptionEnabled,
        ttl: props.caching.ttl,
        type: props.caching.instanceType,
      }) : undefined;

      const schema = new appsync.CfnGraphQLSchema(scope, 'Schema', {
        apiId: api.attrApiId,
        definition: core.Lazy.stringValue({
          produce: () => {
            return blocks.concat(generateSchemaHeader(this)).join('\n');
          }
        }),
      });

      const dataSources = new core.Construct(api, '_DataSources');

      const seenDataTypes = new Set<string>();
      const seenInputTypes = new Set<string>();

      if (isUseful(this.QuerySpec)) {
        parseType(this.QuerySpec.type);
      }
      if (isUseful(this.MutationSpec)) {
        parseType(this.MutationSpec.type);
      }
      if (isUseful(this.SubscriptionSpec)) {
        parseType(this.SubscriptionSpec.type);
      }

      return api;

      function parseType(shape: Shape): void {
        if (shape.FQN === undefined) {
          throw new Error(`shapes must define a FQN for AppSync: ${shape}`);
        }
        if (seenDataTypes.has(shape.FQN)) {
          return;
        }
        if (ShapeGuards.isArrayShape(shape)) {
          // recurse into the Items to discover any custom types
          parseType(shape.Items);
        } else if (ShapeGuards.isTimestampShape(shape)) {
          blocks.push('scalar Timestamp');
        } else if (ShapeGuards.isRecordShape(shape)) {
          seenDataTypes.add(shape.FQN!);

          const typeSpec = props.types.Types[shape.FQN!];
          if (typeSpec === undefined) {
            throw new Error(`could not find type ${shape.FQN} in the TypeIndex`);
          }
          const directives = interpretResolverPipeline(typeSpec);
          generateTypeSignature(typeSpec, directives);
        }
      }

      function generateTypeSignature(typeSpec: TypeSpec, directives: Directives) {
        const fieldShapes = Object.entries(typeSpec.fields);
        const fields = fieldShapes.map(([fieldName, fieldShape]) => {
          const fieldDirectives = (directives[fieldName] || []).join('\n    ');
          if (ShapeGuards.isFunctionShape(fieldShape)) {
            parseType(fieldShape.returns);

            const args = Object.entries(fieldShape.args);
            return `  ${fieldName}(${`${args.map(([argName, argShape]) => {
              const typeAnnotation = getTypeAnnotation(argShape);
              if (ShapeGuards.isRecordShape(argShape)) {
                // generate an Input type for records
                generateInputTypeSignature(argShape);
              }
              return `${argName}: ${typeAnnotation}`;
            }).join(',')}`}): ${getTypeAnnotation(fieldShape.returns)}${fieldDirectives ? `\n    ${fieldDirectives}` : ''}`;
          } else {
            return `  ${fieldName}: ${getTypeAnnotation(fieldShape)}${fieldDirectives ? `\n    ${fieldDirectives}` : ''}`;
          }
        }).join('\n');

        blocks.push(`type ${typeSpec.type.FQN} {\n${fields}\n}`);
      }

      function generateInputTypeSignature(shape: RecordShape): void {
        if (seenInputTypes.has(shape.FQN!)) {
          return;
        }
        seenInputTypes.add(shape.FQN!);
        const inputSpec = `input ${shape.FQN} {\n${Object.entries(shape.Members).map(([fieldName, fieldShape]) => {
          if (!isScalar(fieldShape)) {
            throw new Error(`Input type ${shape.FQN} contains non-scalar type ${fieldShape.FQN} for field ${fieldName}`);
          }
          return `  ${fieldName}: ${getTypeAnnotation(fieldShape)}`;
        }).join('\n')}\n}`;

        blocks.push(inputSpec);
      }

      function interpretResolverPipeline(typeSpec: TypeSpec): Directives {
        const directives: Directives = {};
        const typeName = typeSpec.type.FQN;
        const selfType = typeSpec.type;
        const self = VObject.fromExpr(typeSpec.type, VExpression.text('$context.source'));
        for (const [fieldName, resolver] of Object.entries(typeSpec.resolvers) as [string, FieldResolver<any, any, any>][]) {
          directives[fieldName] = [];
          const {auth, cache, subscribe} = resolver as Partial<AuthMetadata & CacheMetadata<Shape> & SubscribeMetadata<Shape>>;
          if (auth !== undefined) {
            directives[fieldName]!.push(...toAuthDirectives(auth!));
          }
          if (subscribe !== undefined) {
            directives[fieldName]!.push(`@aws_subscribe(mutations:[${(Array.isArray(subscribe) ? subscribe : [subscribe]).map(s => `"${s.field}"`).join(',')}])`);
          }
          const fieldShape = typeSpec.fields[fieldName];
          let program: Generator<any, any, any> = undefined as any;
          if (ShapeGuards.isFunctionShape(fieldShape)) {
            const args = Object.entries(fieldShape.args).map(([argName, argShape]) => ({
              [argName]: VObject.fromExpr(argShape, VExpression.text(`$context.arguments.${argName}`))
            })).reduce((a, b) => ({...a, ...b}));
            if (resolver.resolve) {
              program = resolver.resolve.bind(self)(args as any, self);
            }
          } else if (resolver.resolve) {
            program = (resolver as any).resolve.bind(self)(self);
          }
          if (program === undefined) {
            program = (function*() {})();
          }

          const functions: appsync.CfnFunctionConfigurationProps[] = [];
          // let template: string[] = [];
          let stageCount = 0;

          // create a FQN for the <type>.<field>
          const fieldFQN = `${typeName}_${fieldName}`.replace(/[^_0-9A-Za-z]/g, '_');

          const initState = new InterpreterState();

          const result = interpretProgram(program, initState, interpret);

          function interpret(stmt: any, state: InterpreterState): any {
            if(StatementGuards.isGetState(stmt)) {
              return state;
            } else if (StatementGuards.isStash(stmt)) {
              const stashId = state.stash(stmt.value, stmt);
              return VObject.fromExpr(VObject.getType(stmt.value), VExpression.text(stashId));
            } else if (StatementGuards.isWrite(stmt)) {
              state.write(...stmt.expressions);
              return undefined;
            } else if (StatementGuards.isForLoop(stmt)) {
              const itemId = `$${state.newId('item')}`;

              state.write(VExpression.concat(
                '#forEach( ', itemId, ' in ', stmt.list, ')'
              )).indent().writeLine();

              interpretProgram(
                stmt.then(VObject.fromExpr(VObject.getType(stmt.list).Items, VExpression.text(itemId))),
                state,
                interpret
              );
              state.unindent().writeLine().write('#end');
              return undefined;
            } else if (StatementGuards.isIf(stmt)) {
              const [returnId, branchYieldValues] = parseIf(stmt, state, interpret);

              const allUndefined = branchYieldValues.filter(v => v !== undefined).length === 0;

              const returnedValues = branchYieldValues
                // map undefined to VNothing
                .map(r => r === undefined ? new VNothing(VExpression.text('null')) : r as VObject)
                // filter duplicates
                .filter((r, index, self) => self.findIndex(v => VObject.getType(r).equals(VObject.getType(v))) === index)
              ;

              // derive a VObject to represent the returned value of the if-else-then branches
              const returnValue = returnedValues.length === 1 ? returnedValues[0] : new VUnion(
                new UnionShape(returnedValues.map(v => VObject.getType(v))),
                VExpression.text(returnId)
              );

              if (!allUndefined) {
                return state.stash(returnValue);
              } else {
                return new VNothing(VExpression.text('null'));
              }
            } else if (StatementGuards.isCall(stmt)) {
              const name = state.newId();
              state.write(VObject.getExpr(stmt.request));
              const requestMappingTemplate = state.renderTemplate();
              // return a reference to the previou s result
              const responseMappingTemplate = `#set($context.stash.${name} = $context.result)\n`;
              // clear template state
              const stageName = `${fieldFQN}${stageCount += 1}`;
              const dataSourceProps = Build.resolve(stmt.dataSourceProps)(dataSources, fieldFQN);
              // TODO: de-duplicate data sources
              const dataSource = new appsync.CfnDataSource(scope, `DataSource(${stageName})`, {
                ...dataSourceProps,
                apiId: api.attrApiId,
                name: stageName,
              });
              functions.push({
                apiId: api.attrApiId,
                name: stageName,
                requestMappingTemplate,
                responseMappingTemplate,
                dataSourceName: dataSource.attrName,
                functionVersion: '2018-05-29',
              });
              return VObject.fromExpr(stmt.responseType, VExpression.text(`$context.stash.${name}`));
            }
            console.error('unsupported statement type', stmt);
            throw new Error(`unsupported statement type: ${state}`);
          }

          let _noneDataSource: appsync.CfnDataSource | undefined;
          const noneDataSource = () => {
            if (!_noneDataSource) {
              _noneDataSource = new appsync.CfnDataSource(scope, 'None', {
                apiId: api.attrApiId,
                name: 'NONE',
                type: 'NONE',
                description: 'Empty Data Source'
              });
            }
            return _noneDataSource;
          };

          const config: {
            kind: 'PIPELINE' | 'UNIT';
            requestMappingTemplate?: string;
            responseMappingTemplate?: string;
            dataSourceName?: string;
            pipelineConfig?: appsync.CfnResolver.PipelineConfigProperty;
          } = {
            kind: 'UNIT'
          };

          if (functions.length === 0) {
            config.dataSourceName = noneDataSource().attrName;
            config.requestMappingTemplate = initState.write(VExpression.json({
              version: '2017-02-28',
              paylaod: result === undefined ? {} : VExpression.concat('$util.toJson(', result, ')')
            })).renderTemplate();
            config.responseMappingTemplate = result === undefined ? '{}' : initState.write('$util.toJson(', result, ')').renderTemplate();
          } else {
            if (result !== undefined) {
              initState.write('$util.toJson(', result, ')');
            } else {
              initState.write('{}');
            }
            if (functions.length === 1) {
              config.dataSourceName = functions[0].dataSourceName;
              config.requestMappingTemplate = functions[0].requestMappingTemplate;
              config.responseMappingTemplate = functions[0].responseMappingTemplate + '\n' + initState.renderTemplate();
            } else {
              config.kind = 'PIPELINE';
              config.requestMappingTemplate = '{}';
              config.pipelineConfig = {
                functions: functions.map((f, i) =>
                  new appsync.CfnFunctionConfiguration(scope, `Function(${fieldFQN}, ${i})`, {
                    ...f,
                    // intermediate pipelines should emit an empty object to the next function or final response mapping template
                    responseMappingTemplate: f.responseMappingTemplate + '{}'
                  }).attrFunctionId)
              };
              config.responseMappingTemplate = initState.renderTemplate();
            }
          }

          const cfnResolver = new appsync.CfnResolver(scope, `Resolve(${fieldFQN})`, {
            ...config,
            apiId: api.attrApiId,
            typeName,
            fieldName,
            cachingConfig: (() => {
              let cachingConfig: appsync.CfnResolver.CachingConfigProperty | undefined;
              if (apiCache) {
                if (cache !== undefined) {
                  cachingConfig = {
                    cachingKeys: cache.keys,
                    ttl: cache.ttl
                  };
                }
                if (props.caching && isPerResolverCachingConfiguration(props.caching)) {
                  // override the resolver level caching with one overriden by the API root.
                  const cache: any = (props.caching.resolvers?.[selfType.FQN] as any)?.[fieldName];
                  if (cache !== undefined) {
                    cachingConfig = {
                      cachingKeys: cache.keys,
                      ttl: cache.ttl
                    };
                  }
                }
              }
              if (cachingConfig !== undefined) {
                return {
                  ...cachingConfig,
                  cachingKeys: cachingConfig.cachingKeys?.map((k: string) =>
                    k.startsWith('$context.identity') ? k : `$context.arguments.${k}`
                  )
                };
              }
              return undefined;
            })()
          });
          cfnResolver.addDependsOn(schema);
        }
        return directives;
      }
    });
  }
}

type Directives = {
  [field in string]?: string[]; // directives
};

const generateSchemaHeader = (api: Api<any, any, any, any>) => `schema {
  ${[
    isUseful(api.QuerySpec) ? `query: ${api.QuerySpec.type.FQN}` : undefined,
    isUseful(api.MutationSpec) ? `mutation: ${api.MutationSpec.type.FQN}` : undefined,
    isUseful(api.SubscriptionSpec) ? `subscription: ${api.SubscriptionSpec.type.FQN}` : undefined,
  ].filter(_ => _ !== undefined).join(',\n  ')}
}`;

const isUseful = (spec?: TypeSpec): spec is TypeSpec => {
  return spec !== undefined && Object.keys(spec.fields).length > 0;
};

// gets the GraphQL type annotaiton syntax for a Shape
function getTypeAnnotation(shape: Shape): string {
  const {graphqlType} = Meta.get(shape, ['graphqlType']);

  const isNullable = isOptional(shape);

  shape = isNullable ? (shape as UnionShape<Shape[]>).Items.find(i => !ShapeGuards.isNothingShape(i))! : shape;

  return `${getTypeName()}${isNullable === true ? '' : '!'}`;

  function getTypeName(): string {
    if (typeof graphqlType === 'string') {
      return graphqlType;
    } else if (ShapeGuards.isArrayShape(shape) || ShapeGuards.isSetShape(shape)) {
      return `[${getTypeAnnotation(shape.Items)}]`;
    } else if (ShapeGuards.isMapShape(shape)) {
      throw new Error(`maps are not supported in GraphQL - use a RecordType instead`);
    } else if (ShapeGuards.isStringShape(shape)) {
      return 'String';
    } else if (ShapeGuards.isTimestampShape(shape)) {
      return 'Timestamp';
    } else if (ShapeGuards.isBoolShape(shape)) {
      return 'Boolean';
    } else if (ShapeGuards.isNumberShape(shape)) {
      return ShapeGuards.isIntegerShape(shape) ? 'Int' : 'Float';
    } else if (ShapeGuards.isRecordShape(shape)) {
      if (shape.FQN === undefined) {
        throw new Error(`Only records wit a FQN are supported as types in Graphql. class A extends Record('FQN', { .. }) {}`);
      }
      return shape.FQN!;
    } else {
      throw new Error(`shape type ${shape.FQN} is not supported by GraphQL`);
    }
  }
}

function isScalar(shape: Shape) {
  return ShapeGuards.isStringShape(shape)
    || ShapeGuards.isNumberShape(shape)
    || ShapeGuards.isBoolShape(shape)
    || ShapeGuards.isTimestampShape(shape);
}
