import type * as appsync from '@aws-cdk/aws-appsync';

import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Construct, Scope } from '../core/construct';
import { Resource } from '../core/resource';
import { ApiFragment } from './fragment';
import { Methods, TypeIndex } from './impl';
import { VInterpreter } from './intepreter';
import { Resolved } from './syntax/resolver';

export interface OverrideApiProps extends Omit<appsync.GraphQLApiProps,
  'schemaDefinition' |
  'schemaDefinitionFile'
> {}

/**
 * @typeparam Types - map of names to types in this API
 */
export class Api<
  T extends TypeIndex = {},
  Q extends Methods = {},
  M extends Methods = {},
> extends Construct implements Resource<appsync.GraphQLApi> {
  public static from<F extends ApiFragment<{}, {}, {}>>(fragment: F)
    : Api<
    F['Types'],
    F['Query'],
    F['Mutation']
  > {
    return null as any;
  }

  public readonly resource: Build<appsync.GraphQLApi>;
  public readonly interpret: Build<void>;

  public readonly Types: T;
  public readonly Query: Q;
  public readonly Mutation: M;

  constructor(scope: Scope, id: string, buildProps: Build<OverrideApiProps>) {
    super(scope, id);
    this.resource = Build.concat(
      CDK,
      Scope.resolve(scope),
      buildProps || Build.of(undefined)
    ).map(([{appsync}, scope, buildProps]) => new appsync.GraphQLApi(scope, id, {
      ...buildProps,
      schemaDefinition: deriveSchema(),
    }));

    this.interpret = CDK.chain(({appsync}) => this.resource.map(api => {
      const interpreter = new VInterpreter(api);
      for (const [fieldName, value] of Object.entries(this)) {
        if (Resolved.isResolved(value)) {
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
