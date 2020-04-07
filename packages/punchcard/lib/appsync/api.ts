import type * as appsync from '@aws-cdk/aws-appsync';

import { Meta, Shape, ShapeGuards } from '@punchcard/shape';
import { RecordShape } from '@punchcard/shape/lib/record';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Construct, Scope } from '../core/construct';
import { Resource } from '../core/resource';
import { VExpression } from './expression';
import { ApiFragment } from './fragment';
import { Statement, StatementGuards } from './statement';
import { TypeSpec, TypeSystem } from './type-system';
import { VTL } from './vtl';
import { VObject } from './vtl-object';

export interface OverrideApiProps extends Omit<appsync.GraphQLApiProps,
  | 'name'
  | 'schemaDefinition'
  | 'schemaDefinitionFile'
> {}

export interface ApiProps<
  T extends TypeSystem,
  Q extends keyof T | undefined = undefined,
  M extends keyof T | undefined = undefined
> {
  types: ApiFragment<T>;
  query?: Q;
  mutation?: M;
  name: string;
  overrideProps?: Build<OverrideApiProps>;
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
  Q extends keyof T | undefined,
  M extends keyof T | undefined
> extends Construct implements Resource<appsync.GraphQLApi> {
  public readonly resource: Build<appsync.GraphQLApi>;

  public readonly Types: {
    // eumerate through to clean up the type siganture ("Compaction").
    [t in keyof T]: {
      [k in keyof T[t]]: T[t][k]
    };
  };
  public readonly QueryFQN: Q;
  public readonly QueryType: Q extends keyof T ? T[Q]['type'] : undefined;
  public readonly MutationFQN: M;
  public readonly MutationType: M extends keyof T ? T[M]['type'] : undefined;

  constructor(scope: Scope, id: string, props: ApiProps<T, Q, M>) {
    super(scope, id);
    this.Types = props.types.Types;
    if (props.query !== undefined) {
      this.QueryFQN = props.query;
      this.QueryType = this.Types[props.query!].type as any;
    }
    if (props.mutation !== undefined) {
      this.MutationFQN = props.mutation;
      this.MutationType = this.Types[props.mutation!].type as any;
    }

    this.resource = Build.concat(
      CDK,
      Scope.resolve(scope),
      props.overrideProps || Build.of(undefined)
    ).map(([{appsync, core}, scope, buildProps]) => {
      const blocks: string[] = [generateSchemaHeader(this)];

      const api = new appsync.GraphQLApi(scope, id, {
        ...buildProps,
        name: props.name,
        schemaDefinition: core.Lazy.stringValue({
          produce: () => blocks.join('\n')
        }),
      });
      const dataSources = new core.Construct(api, '_DataSources');

      const seenDataTypes = new Set<string>();
      const seenInputTypes = new Set<string>();

      if (this.QueryType) {
        parseType(this.QueryType!);
      }
      if (this.MutationType) {
        parseType(this.MutationType!);
      }

      console.log(blocks.join('\n'));
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
          generateTypeSignature(typeSpec);
          interpretResolverPipeline(typeSpec);
        }
      }

      function generateTypeSignature(typeSpec: TypeSpec) {
        const fieldShapes = Object.entries(typeSpec.fields);

        const fields = fieldShapes.map(([fieldName, fieldShape]) => {
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
            }).join(',')}`}): ${getTypeAnnotation(fieldShape.returns)}`;
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
          return `${fieldName}: ${getTypeAnnotation(shape)}`;
        }).join('\n')}}`;

        blocks.push(inputSpec);
      }

      function interpretResolverPipeline(typeSpec: TypeSpec) {
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

          const functions: string[] = [];
          let template: string[] = [];

          let i = 0;
          const id = () => 'var' + (i += 1).toString(10);

          // create a FQN for the <type>.<field>
          const fieldFQN = `${typeName}_${fieldName}`.replace(/[_A-Za-z][_0-9A-Za-z]/g, '_');

          let next: IteratorResult<Statement<VObject | void>, any>;
          let returns: VObject | undefined;
          while (!(next = generator.next(returns)).done) {
            const stmt = next.value;
            if (StatementGuards.isSet(stmt)) {
              const name = stmt.id || id();
              template.push(`#set($context.stash.${name} = ${VObject.exprOf(stmt.value).visit({indentSpaces: 0}).text})`);

              // return a reference to the set value
              returns = VObject.clone(stmt.value, new VExpression(`$context.stash.${name}`));
            } else if (StatementGuards.isCall(stmt)) {
              const name = id();
              template.push(VObject.exprOf(stmt.request).visit({indentSpaces: 0}).text);
              const requestMappingTemplate = template.join('\n');
              // return a reference to the previou s result
              returns = VObject.of(stmt.responseType, new VExpression(`$context.stash.${name}`));
              const responseMappingTemplate = `#set($context.stash.${name} = $context.prev.result)\n`;

              console.log(template.join('\n'));
              // clear template state
              template = [];

              const dataSourceProps = Build.resolve(stmt.dataSourceProps)(dataSources, fieldFQN);
              const dataSource = new appsync.CfnDataSource(scope, `DataSource(${fieldFQN})`, {
                ...dataSourceProps,
                apiId: api.apiId,
                name: fieldFQN,
              });

              const functionConfiguration = new appsync.CfnFunctionConfiguration(scope, `Function(${fieldFQN})`, {
                apiId: api.apiId,
                name: fieldFQN,
                requestMappingTemplate,
                responseMappingTemplate,
                dataSourceName: dataSource.name,
                functionVersion: '2018-05-29',
              });

              functions.push(functionConfiguration.name);
            } else {
              throw new Error(`unknown statement: ${next.value}`);
            }
          }
          if (next.value !== undefined) {
            template.push(VObject.exprOf(next.value as VObject).visit({indentSpaces: 0}).text);
          }

          new appsync.CfnResolver(scope, `Resolve(${fieldFQN})`, {
            apiId: api.apiId,
            typeName,
            fieldName,
            kind: 'PIPELINE', // always pipeline cuz we cool like that
            pipelineConfig: {
              functions
            },
            responseMappingTemplate: template.join('\n')
          });
        }
      }
    });
  }
}

const generateSchemaHeader = (api: Api<any, any, any>) => `schema {
  ${api.QueryType ? `Query: ${api.QueryType!.FQN}${api.MutationType ? ',' : ''}` : ''}
  ${api.MutationType ? `Mutation: ${api.MutationType!.FQN}` : ''}
}`;

// gets the GraphQL type annotaiton syntax for a Shape
function getTypeAnnotation(shape: Shape): string {
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
