import type * as appsync from '@aws-cdk/aws-appsync';

import { PrimitiveShapes, RecordShape, RecordType, Shape } from '@punchcard/shape';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Construct, Scope } from '../core/construct';
import { Resource } from '../core/resource';
import { VInterpreter } from './intepreter';
import { Resolved } from './syntax/resolver';
import { GraphQLType, VObject, ID } from './types';
import { QLDB } from 'aws-sdk';

export interface OverrideApiProps extends Omit<appsync.GraphQLApiProps,
  'schemaDefinition' |
  'schemaDefinitionFile'
> {}

export const FQN = Symbol.for('Type');
export type FQN = typeof FQN;

/**
 * 
 */
export type Type = ({
  [FQN]: string;
} & RecordShape);

/**
 * 
 */
export interface ImportIndex {
  [type: string]: Type;
}
export namespace ImportIndex {
  export type FromTypeUnion<I extends Type> = {
    [fqn in I[FQN]]: Extract<I, {
      [FQN]: fqn;
    }>;
  };
  export type Mixins<T extends ImportIndex> = {
    [t in keyof T]?: (self: VObject.Of<T[t]>) => {
      [fieldName: string]: Resolved<any>;
    };
  };
}

/**
 * ```ts
 * {
 *   import: [
 *     ImportA,
 *     ImportB
 *   ]
 * }
 * ```
 */
// export type Namespace = Type;

/**
 * Set of types to import into an API namespace.
 */
export type Imports = Type[];
export namespace Imports {
  // export type Types<I extends Imports> = I[Extract<keyof I, number>];

  /**
   * Union of all imported types.
   *
   * I.e. represents the types that are valid within a specific scope.
   */
  export type Types<I extends Imports> = I[Extract<keyof I, number>];

  /**
   * Union of all fully qualified names contained within a set of `Imports`.
   */
  export type FullyQualifiedNames<I extends Imports> = Types<I>[FQN];

  /**
   * Lookup a type by its FQN.
   *
   * This is a hyper-useful tool as it lets us associate data with
   * a type by its name, enabling APIs to be built with mix-ins.
   */
  export type LookupByFQN<I extends Imports, Tag extends string> = Extract<Types<I>, { [FQN]: Tag; }>;

  /**
   * Create an index from FQN -> Type for types within a given set of imports.
   */
  export type ToIndex<I extends Imports> = {
    [t in FullyQualifiedNames<I>]: LookupByFQN<I, t>;
  };

  /**
   * Represents a set of mix-ins for a given set of imports.
   *
   * Types that are "imported" can have fields dynamically mixed in,
   * creating a free-flowing modular approach to designing AppSync APIs.
   *
   * ```ts
   * import: [
   *    User,
   *    Post,
   * ],
   * export: {
   *   Post: post => ({ .. })
   * }
   * ```
   */
  export type Mixins<I extends Imports> = {
    [fqn in Imports.FullyQualifiedNames<I>]?: (self: VObject.Of<Imports.LookupByFQN<I, fqn>>) => {
      [fieldName: string]: Resolved<any>;
    };
  };
}

export type LookupByFQN<T extends Type, Tag extends string> = Extract<T, { [FQN]: Tag; }>;

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

export type Exports<I extends Type> = {
  [fqn in I[FQN]]?: (self: VObject.Of<LookupByFQN<I, fqn>>) => {
    [fieldName: string]: Resolved<any>;
  };
};

export namespace Type {
  export type FromImports<T extends Type[]> = Extract<T[Extract<keyof T, number>], Type>;

  export type Resolvers<T extends Type> = {
    [fqn in T[FQN]]?: (self: VObject.Of<LookupByFQN<T, fqn>>) => {
      [fieldName: string]: Resolved<any>;
    };
  };
}

export interface ApiFragmentProps<
  I extends Imports,
  R extends Type.Resolvers<Type.FromImports<I>>,
  Q extends Methods,
  M extends Methods
> {
  import?: I;
  resolvers?: {
    [r in keyof R]: R[r];
  }
  query?: Q;
  mutation?: M;
}

export class ApiFragment<
  I extends Type,
  R extends Type.Resolvers<I>,
  Q extends Methods,
  M extends Methods,
> {
  public static new<
    I extends Imports,
    R extends Type.Resolvers<Type.FromImports<I>>,
    Q extends Methods,
    M extends Methods
  >(
    props: ApiFragmentProps<I, R, Q, M>): ApiFragment<
      Type.FromImports<I>,
      R,
      Q,
      M
    > {
      return null as any;
  }

  public readonly import: I;
  public readonly resolvers: R;
  public readonly query: Q;
  public readonly mutation: M;

  constructor() {
    // this.import = props.import;
    // this.export = props.export || {};
    // this.query = props.query || {};
    // this.mutation = props.mutation || {};
  }
}
export namespace ApiFragment {
  export function join<
    F1 extends ApiFragment<Type, {}, {}, {}>,
    F2 extends ApiFragment<Type, {}, {}, {}>,
  >(
    f1: F1,
    f2: F2
  ): ApiFragment<
    F1['import'] | F2['import'],
    F1['resolvers'] & F2['resolvers'],
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
  I extends Imports,
  R extends Imports.Mixins<I> = {},
  Q extends Methods = {},
  M extends Methods = {},
> extends Construct implements Resource<appsync.GraphQLApi> {
  public static from<F extends ApiFragment<Type, {}, {}, {}>>(fragment: F)
    : Api<
    F['import'][],
    F['resolvers'],
    F['query'],
    F['mutation']
  > {
    return null as any;
  }

  public readonly resource: Build<appsync.GraphQLApi>;
  public readonly interpret: Build<void>;

  public readonly Imports: I;
  public readonly ImportIndex: Imports.ToIndex<I>;
  public readonly Resolvers: R;
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
