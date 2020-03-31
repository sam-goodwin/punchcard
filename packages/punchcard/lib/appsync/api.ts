import type * as appsync from '@aws-cdk/aws-appsync';

import { RecordMembers, RecordShape } from '@punchcard/shape/lib/record';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Construct, Scope } from '../core/construct';
import { Resource } from '../core/resource';
import { ApiFragment, ShapeIndex } from './fragment';
import { VInterpreter } from './intepreter';
import { VolatileExpression } from './syntax';
import { ResolverImpl } from './syntax/resolver';
import { VTL } from './types';

export interface OverrideApiProps extends Omit<appsync.GraphQLApiProps,
  | 'name'
  | 'schemaDefinition'
  | 'schemaDefinitionFile'
> {}

export interface ApiProps<
  T extends ShapeIndex,
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
  T extends ShapeIndex,
  Q extends RecordShape<RecordMembers, Extract<keyof T, string>> | undefined,
  M extends RecordShape<RecordMembers, Extract<keyof T, string>> | undefined,
> extends Construct implements Resource<appsync.GraphQLApi> {
  public readonly resource: Build<appsync.GraphQLApi>;
  public readonly interpret: Build<void>;

  public readonly Types: T;
  public readonly Query: Q extends { FQN: keyof T } ? T[Q['FQN']]['fields'] : undefined;
  public readonly Mutation: M extends { FQN: keyof T } ? T[M['FQN']]['fields'] : undefined;

  constructor(scope: Scope, id: string, props: ApiProps<T, Q, M>) {
    super(scope, id);
    this.resource = Build.concat(
      CDK,
      Scope.resolve(scope),
      props.overrideProps || Build.of(undefined)
    ).map(([{appsync}, scope, buildProps]) => {
      const types: any = {};

      for (const [fqn, type] of Object.entries(props.types.Types)) {
        const self = VTL.of(type.type, new VolatileExpression(type.type, "$context.source"));
        types[fqn] = {
          type,
          fields: type.fields
        };
      }

      const api = new appsync.GraphQLApi(scope, id, {
        ...buildProps,
        name: props.name,
        schemaDefinition: deriveSchema(),
      });

      return api;
    });

    this.interpret = CDK.chain(({appsync}) => this.resource.map(api => {
      const interpreter = new VInterpreter(api);
      for (const [fieldName, value] of Object.entries(this)) {
        if (ResolverImpl.isResolved(value)) {
          console.log(fieldName, value);
          interpreter.interpret(fieldName, value);
        }
      }
    }));

    function deriveSchema(): string {
      return 'todo';
    }
  }
}
