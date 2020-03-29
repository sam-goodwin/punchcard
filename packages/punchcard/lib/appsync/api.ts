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

export const FQN = Symbol.for('Type');
// export const FQN = 'FQN';
export type FQN = typeof FQN;

export function fqn<T extends RecordShape<any>, FQN extends string>(shape: T, fqn: FQN): FQN {
  return null as any;
}

/**
 *
 */
export type Type = ({
  FQN: string;
} & RecordShape);

export namespace Type {
}
export type Fields = {
  [fieldName: string]: Resolved<any> | undefined;
};

export interface Methods {
  [methodName: string]: Resolved<any>;
}

export interface Impl<T extends RecordShape = any, F extends Fields = Fields> {
  type: T;
  fields: (self: VObject.Of<T>) => F;
}
export interface ImplIndex {
  [type: string]: Impl[];
}
export namespace ImplIndex {
  type LookupType<FQN extends string, T extends Impl[]> =
    Extract<T[Extract<keyof T, number>]['type'], { FQN: FQN; }>;
  type LookupFields<FQN extends string, T extends Impl[]> =
    ReturnType<Extract<T[Extract<keyof T, number>], {
      type: {
        FQN: FQN;
      }
    }>['fields']>;

  export type FromTuple<T extends Impl[]> = {
    [fqn in T[Extract<keyof T, number>]['type']['FQN']]: {
      type: LookupType<fqn, T>;
      fields: LookupFields<fqn, T>;
    };
  };
}

export function impl<T extends Type, F extends Fields>(
  type: T,
  fields: (self: VObject.Of<T>) => F
): Impl<T, F> {
  return null as any;
}

export interface ApiFragmentProps<
  T extends Impl[] = [],
  Q extends Methods = {},
  M extends Methods = {}
> {
  impl: T;
  query?: Q;
  mutation?: M;
}

export class ApiFragment<
  I extends Impl[],
  Q extends Methods,
  M extends Methods,
> {
  public readonly impl: I;
  public readonly query: Q;
  public readonly mutation: M;

  constructor(props: ApiFragmentProps<I, Q, M>) {
    this.impl = props.impl;
    this.query = (props.query || {}) as Q;
    this.mutation = (props.mutation || {}) as M;
  }
}
import tramp = require('trampoline-test');

export namespace ApiFragment {
  export function join<
    F1 extends ApiFragment<Impl[], {}, {}>,
    F2 extends ApiFragment<Impl[], {}, {}>,
  >(
    f1: F1,
    f2: F2
  ): ApiFragment<
    tramp.Concat<F1['impl'], F2['impl']>,
    F1['query'] & F1['query'],
    F1['mutation'] & F1['mutation']
  > {
    return null as any;
  }
}

/**
 * @typeparam Types - map of names to types in this API
 */
export class Api<
  I extends Impl[] = [],
  Q extends Methods = {},
  M extends Methods = {},
> extends Construct implements Resource<appsync.GraphQLApi> {
  public static from<F extends ApiFragment<Impl[], {}, {}>>(fragment: F)
    : Api<
    F['impl'],
    F['query'],
    F['mutation']
  > {
    return null as any;
  }

  public readonly resource: Build<appsync.GraphQLApi>;
  public readonly interpret: Build<void>;

  public readonly Impls: I;
  public readonly ImplIndex: ImplIndex.FromTuple<I>;
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
