import type * as appsync from '@aws-cdk/aws-appsync';

import { PrimitiveShapes, RecordShape, RecordType, Shape } from '@punchcard/shape';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Construct, Scope } from '../core/construct';
import { Resource } from '../core/resource';
import { VInterpreter } from './intepreter';
import { Resolved } from './syntax/resolver';
import { GraphQLType, VObject } from './types';

export interface OverrideApiProps extends Omit<appsync.GraphQLApiProps,
  'schemaDefinition' |
  'schemaDefinitionFile'
> {}

export interface ApiTypes {
  [typeName: string]: RecordShape<any>;
}

export interface Methods {
  [methodName: string]: Resolved<any>;
}
export type ApiMethod = Methods | undefined;

export interface Root<
  Q extends ApiMethod,
  M extends ApiMethod
> {
  query?: Q;
  mutation?: M;
}

export type Fields<T extends ApiTypes> = {
  [t in keyof T]?: (self: VObject.Of<T[t]>) => {
    [fieldName: string]: Resolved<any>;
  };
};

export interface ApiProps<
  T extends ApiTypes,
  F extends Fields<T>,
  Q extends Methods,
  M extends Methods,
> {
  types?: T;
  fields?: F;
  query?: Q;
  mutation?: M;
}

/**
 * @typeparam Types - map of names to types in this API
 */
export class Api<
  T extends ApiTypes = {},
  F extends Fields<T> = {},
  Q extends Methods = {},
  M extends Methods = {},
> extends Construct implements Resource<appsync.GraphQLApi> {
  public readonly resource: Build<appsync.GraphQLApi>;
  public readonly interpret: Build<void>;

  public readonly Fields: F;
  public readonly Query: Q;
  public readonly Mutation: M;
  public readonly Types: T;

  constructor(scope: Scope, id: string, buildProps: Build<OverrideApiProps>, props: ApiProps<T, F, Q, M>) {
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

  public extend<
    F2 extends Fields<T & T2>,
    T2 extends ApiTypes = {},
    Q2 extends Methods = {},
    M2 extends Methods = {}
  >(props: {
    fields?: F2;
    query?: Q2;
    mutation?: M2;
    types?: T2;
  }): Api<T & T2, F & F2 & Fields<T & T2>, Q & Q2, M & M2> {
    return null as any;
  }

  public fields<F2 extends Fields<T>>(fields: F2): Api<T, F & F2, Q, M> {
    return this.extend({
      fields
    });
  }
}
