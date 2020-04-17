import type * as appsync from '@aws-cdk/aws-appsync';

import { Meta, nothing, Shape, ShapeGuards, string } from '@punchcard/shape';
import { RecordShape } from '@punchcard/shape/lib/record';
import { UserPool } from '../cognito/user-pool';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Construct, Scope } from '../core/construct';
import { Resource } from '../core/resource';
import { ApiFragment } from './api/api-fragment';
import { FullRequestCachingConfiguration, PerResolverCachingConfiguration } from './api/caching';
import { MutationRoot } from './api/mutation';
import { QueryRoot } from './api/query';
import { SubscriptionRoot } from './api/subscription';
import { TypeSpec, TypeSystem } from './api/type-system';
import { VExpression } from './lang/expression';
import { ElseBranch, IfBranch, isIfBranch, Statement, StatementGuards } from './lang/statement';
import { VTL } from './lang/vtl';
import { VObject } from './lang/vtl-object';

import { Subscriptions } from './lang';

export interface OverrideApiProps extends Omit<appsync.GraphQLApiProps,
  | 'name'
  | 'schemaDefinition'
  | 'schemaDefinitionFile'
> {}

export interface ApiProps<
  T extends TypeSystem
> {
  readonly types: ApiFragment<T>;
  readonly subscribe: {
    [subscriptionName in keyof T[SubscriptionRoot.FQN]['resolvers']]?: (
      Subscriptions<T[SubscriptionRoot.FQN]['type']>
    )[];
  };
  readonly caching?: PerResolverCachingConfiguration<T> | FullRequestCachingConfiguration;
  readonly name: string;
  readonly userPool: UserPool<any, any>;
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
      props.overrideProps || Build.of(undefined)
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
        }
      });

      const schema = new appsync.CfnGraphQLSchema(scope, 'Schema', {
        apiId: api.attrApiId,
        definition: core.Lazy.stringValue({
          produce: () => {
            const schema = blocks.concat(generateSchemaHeader(this)).join('\n');
            console.log(schema);
            return schema;
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
          console.log('directives', directives);
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
            return `  ${fieldName}: ${getTypeAnnotation(fieldShape)}`;
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
        const self = VObject.of(typeSpec.type, new VExpression('$context.source'));
        for (const [fieldName, resolver] of Object.entries(typeSpec.resolvers)) {
          const fieldShape = typeSpec.fields[fieldName];
          let generator: VTL<VObject>;
          if (ShapeGuards.isFunctionShape(fieldShape)) {
            const args = Object.entries(fieldShape.args).map(([argName, argShape]) => ({
              [argName]: VObject.of(argShape, new VExpression(`$context.arguments.${argName}`))
            })).reduce((a, b) => ({...a, ...b}));
            generator = resolver.bind(self)(args, self);
          } else {
            generator = resolver.bind(self)(self);
          }

          const functions: appsync.CfnFunctionConfiguration[] = [];
          let template: string[] = [];

          let stageCount = 0;
          const id = (() => {
            const inc: {
              [key: string]: number;
            } = {};

            return (prefix: string = 'var') => {
              const i = inc[prefix];
              if (i === undefined) {
                inc[prefix] = 0;
              }
              return `${prefix}${(inc[prefix] += 1).toString(10)}`;
            };
          })();

          // create a FQN for the <type>.<field>
          const fieldFQN = `${typeName}_${fieldName}`.replace(/[^_0-9A-Za-z]/g, '_');

          let next: IteratorResult<Statement<VObject | void>, any>;
          let returns: VObject | undefined;

          while (!(next = generator.next(returns)).done) {
            const stmt = next.value;
            if (StatementGuards.isDirective(stmt)) {
              if (!directives[fieldName]) {
                directives[fieldName] = [];
              }
              directives[fieldName]?.push(...stmt.directives);
            } else if (StatementGuards.isIf(stmt)) {
              const ifResult = `$context.stash.${id()}`;
              const {expr, returnType} = parseIf(stmt, ifResult);
              const txt = expr.visit({indentSpaces: 0}).text;
              template.push(txt);
              returns = VObject.of(returnType, VExpression.text(ifResult));

              function parseIf(branch: IfBranch<VObject | void>, callback: string): {
                expr: VExpression;
                returnType: Shape;
               } {
                const elseIfBranches: IfBranch<VObject | void>[] = [];
                let elseBranch: ElseBranch<VObject | void> | undefined;

                let b: IfBranch<VObject | void> | ElseBranch<VObject | void> | undefined = branch.elseBranch;
                while (b !== undefined) {
                  if (isIfBranch(b)) {
                    elseIfBranches.push(b);
                    b = b.elseBranch!;
                  } else {
                    elseBranch = b;
                    break;
                  }
                }

                // callback ID for the return
                const localCallback = `$${id('local')}`; // local varible

                const _if = parseBlock(stmt.then(), localCallback);
                const _elseIfs = elseIfBranches.map(b => {
                  const e = parseBlock(b.then(), localCallback);
                  return {
                    expr: VExpression.concat(
                      '#elseif(', b.condition, ')',
                      VExpression.block(e.expr)
                    ),
                    returnType: e.returnType
                  };
                });
                const _else = elseBranch ? parseBlock(elseBranch.then(), localCallback) : undefined;
                const returnTypes: Shape[] = [
                  _if.returnType,
                  ..._elseIfs.map(_ => _.returnType),
                  _else?.returnType
                ].filter(_ => _ !== undefined) as Shape[];

                // generate a name for the return value
                return {
                  expr: VExpression.concat(
                    '#if(', stmt.condition, ')',
                    VExpression.block(_if.expr),
                    ...(_elseIfs.map(_ => _.expr)),
                    ...(_else ? [
                      '#{else}', VExpression.block(_else.expr),
                    ] : []),
                    '#end',
                    VExpression.line(),
                    `#set(${callback} = ${localCallback})`
                  ),
                  returnType: returnTypes ? returnTypes[0] : nothing
                };
              }

              function parseBlock(
                block: VTL<VObject | void>,
                callback: string,
              ): {
                expr: VExpression;
                returnType?: Shape;
               } {
                const expressions: VExpression[] = [];
                let it: IteratorResult<Statement<VObject | void>, any> | undefined;
                let ret: VObject | undefined;
                let returnType: Shape | undefined;
                try {
                  while ((it = block.next(ret)).done === false) {
                    const stmt = it.value;
                    if (StatementGuards.isSet(stmt)) {
                      // we set things locally from within function blocks
                      const name = stmt.id || id();
                      expressions.push(VExpression.concat(`#set($${name} = `, stmt.value, ')'));
                      // return a reference to the set value
                      ret = VObject.clone(stmt.value, new VExpression(`$${name}`));
                    } else if (StatementGuards.isIf(stmt)) {
                      const {expr, returnType} = parseIf(stmt, callback);
                      expressions.push(expr);
                      ret = VObject.of(returnType, new VExpression(`$${callback}`));
                    } else if (StatementGuards.isCall(stmt)) {
                      throw new Error(`Calls to services are not supported within an If branch.`);
                    } else {
                      throw new Error(`unsupported syntax within an If: ${stmt}`);
                    }
                  }
                } catch (err) {
                  if (VObject.isObject(err)) {
                    returnType = VObject.typeOf(err);
                    expressions.push(VObject.exprOf(err));
                  } else {
                    throw err;
                  }
                }
                if (it && it!.value !== undefined) {
                  expressions.push(VExpression.concat(
                    `#set(${callback} = `, it!.value, ')')
                  );
                }
                // what to do with the return?
                return {
                  expr: VExpression.concat(...expressions),
                  returnType
                };
              }
            } else if (StatementGuards.isSet(stmt)) {
              const name = stmt.id || id();
              template.push(`#set($context.stash.${name} = ${VObject.exprOf(stmt.value).visit({indentSpaces: 0}).text})`);

              // return a reference to the set value
              returns = VObject.clone(stmt.value, new VExpression(`$context.stash.${name}`));
            } else if (StatementGuards.isCall(stmt)) {
              const name = id();
              template.push(VObject.exprOf(stmt.request).visit({indentSpaces: 0}).text);
              const requestMappingTemplate = template.join('\n');
              console.log(requestMappingTemplate);
              // return a reference to the previou s result
              returns = VObject.of(stmt.responseType, new VExpression(`$context.stash.${name}`));
              const responseMappingTemplate = `#set($context.stash.${name} = $context.result){}\n`;

              // clear template state
              template = [];

              const stageName = `${fieldFQN}${stageCount += 1}`;
              const dataSourceProps = Build.resolve(stmt.dataSourceProps)(dataSources, fieldFQN);
              const dataSource = new appsync.CfnDataSource(scope, `DataSource(${fieldFQN})`, {
                ...dataSourceProps,
                apiId: api.attrApiId,
                name: stageName,
              });

              const functionConfiguration = new appsync.CfnFunctionConfiguration(scope, `Function(${fieldFQN})`, {
                apiId: api.attrApiId,
                name: stageName,
                requestMappingTemplate,
                responseMappingTemplate,
                dataSourceName: dataSource.attrName,
                functionVersion: '2018-05-29',
              });
              functions.push(functionConfiguration);
            } else {
              throw new Error(`unknown statement: ${next.value}`);
            }
          }
          if (next.value !== undefined) {
            template.push(VExpression.concat(
              VExpression.text('$util.toJson('),
              VObject.exprOf(next.value as VObject),
              VExpression.text(')'
            )).visit({indentSpaces: 0}).text);
          }

          const cfnResolver =new appsync.CfnResolver(scope, `Resolve(${fieldFQN})`, {
            apiId: api.attrApiId,
            typeName,
            fieldName,
            kind: 'PIPELINE', // always pipeline cuz we cool like that
            pipelineConfig: {
              functions: functions.map(f => f.attrFunctionId)
            },
            requestMappingTemplate: '#set($init = 0){}', ////
            responseMappingTemplate: template.join('\n')
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
function getTypeAnnotation(shape: Shape, directives?: string[]): string {
  const {graphqlType, isNullable} = Meta.get(shape, ['graphqlType', 'isNullable']);

  return `${getTypeName()}${isNullable === true ? '' : '!'}`;

  function getTypeName(): string {
    if (typeof graphqlType === 'string') {
      return graphqlType;
    } else if (ShapeGuards.isArrayShape(shape)) {
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
      return 'Float';
    } else if (ShapeGuards.isIntegerShape(shape)) {
      return 'Int';
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
    || ShapeGuards.isNumericShape(shape)
    || ShapeGuards.isBoolShape(shape)
    || ShapeGuards.isTimestampShape(shape);
}
