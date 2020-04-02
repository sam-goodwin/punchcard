import type * as appsync from '@aws-cdk/aws-appsync';

import { ShapeGuards } from '@punchcard/shape';
import { RecordMembers, RecordShape } from '@punchcard/shape/lib/record';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Construct, Scope } from '../core/construct';
import { Resource } from '../core/resource';
import { ApiFragment } from './fragment';
import { StatementGuards, VExpression } from './syntax';
import { TraitImplIndex } from './trait';
import { expr, VObject, VTL } from './types';

export interface OverrideApiProps extends Omit<appsync.GraphQLApiProps,
  | 'name'
  | 'schemaDefinition'
  | 'schemaDefinitionFile'
> {}

export interface ApiProps<
  T extends TraitImplIndex,
  Q extends RecordShape<RecordMembers, Extract<keyof T, string>> | undefined,
  M extends RecordShape<RecordMembers, Extract<keyof T, string>> | undefined
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
  T extends TraitImplIndex,
  Q extends RecordShape<RecordMembers, Extract<keyof T, string>> | undefined,
  M extends RecordShape<RecordMembers, Extract<keyof T, string>> | undefined,
> extends Construct implements Resource<appsync.GraphQLApi> {
  public static new() {}

  public readonly resource: Build<appsync.GraphQLApi>;
  public readonly interpret: Build<void>;

  public readonly Types: T;
  public readonly QueryType: Q;
  public readonly Query: Q extends { FQN: keyof T } ? T[Q['FQN']]['impl'] : undefined;
  public readonly MutationType: M;
  public readonly Mutation: M extends { FQN: keyof T } ? T[M['FQN']]['impl'] : undefined;

  constructor(scope: Scope, id: string, props: ApiProps<T, Q, M>) {
    super(scope, id);
    this.resource = Build.concat(
      CDK,
      Scope.resolve(scope),
      props.overrideProps || Build.of(undefined)
    ).map(([{appsync, core}, scope, buildProps]) => {
      const types: any = {};

      const blocks: string[] = [
        `schema {
          ${this.Query ? `Query: ${this.QueryType!.FQN}` : ''}
          ${this.Mutation ? ',' : ''}
          ${this.Mutation ? `Mutation: ${this.MutationType!.FQN}` : ''}
        }`
      ];

      const api = new appsync.GraphQLApi(scope, id, {
        ...buildProps,
        name: props.name,
        schemaDefinition: core.Token.asString(() => blocks.join('\n')),
      });

      for (const [typeName, impl] of Object.entries(props.types.Types)) {
        const self = VTL.of(impl.type, new VExpression('$context.source'));
        blocks.push(`type ${typeName} {
          ${Object.entries(impl.fields).map(([fieldName, fieldShape]) => {
            let generator: VTL<VObject>;
            if (ShapeGuards.isFunctionShape(fieldShape)) {
              // todo: args
              generator = (impl as any).impl({}, self);
            } else {
              generator = (impl as any).impl({}, self);
            }

            let next = generator.next();
            let template: string[] = [];

            let i = 0;

            while (!(next = generator.next()).done) {
              const stmt = next.value;
              if (StatementGuards.isSet(stmt)) {
                const name = stmt.id || (i += 1).toString(10);
                template.push(`#set($${name} = ${stmt.value[expr].visit()})`);
              } else if (StatementGuards.isCall(stmt)) {
                template.push(stmt.request[expr].visit());
                const requestMappingTemplate = template.join('\n');
                const responseMappingTemplate = stmt.response[expr].visit();
                // const dataSource = stmt.resolverFunction;
                template = [];

                const fqn = `${typeName}.${fieldName}`;
                const dataSourceProps = Build.resolve(stmt.dataSourcePRops);
                const dataSource = new appsync.CfnDataSource(scope, `DataSource(${fqn})`, {
                  ...dataSourceProps,
                  apiId: api.apiId,
                  name: fqn,
                });

                const resolver = new appsync.CfnResolver(scope, `Resolve(${fqn})`, {
                  apiId: api.apiId,
                  typeName,
                  fieldName,
                  requestMappingTemplate,
                  responseMappingTemplate,
                  dataSourceName: dataSource.name
                });
              } else {
                throw new Error(`unknown statement: ${next}`);
              }
            }
          })}
        }`);
      }

      return api;
    });
  }
}

