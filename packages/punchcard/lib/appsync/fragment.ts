import { RecordShape } from '@punchcard/shape';
import { Fields, Methods, Resolvers, TypeIndex } from './impl';
import { VObject } from './types/object';

export interface ApiFragmentProps<
  T extends TypeIndex = {},
  Q extends Methods = {},
  M extends Methods = {}
> {
  types?: T;
  query?: Q;
  mutation?: M;
}

export class ApiFragment<
  I extends TypeIndex,
  Q extends Methods,
  M extends Methods,
> {
  /**
   * Start a new API Fragment by defining a type with field resolvers.
   *
   * @param type type these fields are associated with.
   * @param fields resolved fields to add to this `type`.
   */
  public static type<T extends RecordShape, F extends Fields>(
    type: T,
    fields: (self: VObject.Of<T>) => F
  ): ApiFragment<{
    [fqn in T['FQN']]: Resolvers<T, ReturnType<typeof fields>>;
  }, {}, {}> {
    return new ApiFragment({
      types: {
        [type.FQN]: {
          type,
          fields
        }
      } as any,
      mutation: {},
      query: {}
    });
  }

  /**
   * Create a new `ApiFragment` with some initial query methods.
   *
   * @param query methods available on this fragment.
   */
  public static query<Q extends Methods>(query: Q): ApiFragment<{}, Q, {}> {
    return new ApiFragment({query});
  }

  /**
   * Create a new `ApiFragment` with some initial mutation methods.
   *
   * @param mutation methods available on this fragment.
   */
  public static mutation<M extends Methods>(mutation: M): ApiFragment<{}, {}, M> {
    return new ApiFragment({mutation});
  }

  public readonly Types: I;
  public readonly Query: Q;
  public readonly Mutation: M;

  constructor(props: ApiFragmentProps<I, Q, M>) {
    this.Types = (props.types || {}) as I;
    this.Query = (props.query || {}) as Q;
    this.Mutation = (props.mutation || {}) as M;
  }

  public type<T extends RecordShape, F extends Fields>(
    type: T,
    fields: (self: VObject.Of<T>) => F
  ): ApiFragment<I & {
    [fqn in T['FQN']]: Resolvers<T, ReturnType<typeof fields>>;
  }, Q, M> {
    return this.include(ApiFragment.type(type,fields));
  }

  /**
   * Appends queries to this `ApiFragment`.
   *
   * A new fragment is returned - `ApiFragments` are never mutated.
   *
   * @param query methods available on this fragment.
   */
  public query<Q2 extends Methods>(query: Q2): ApiFragment<I, Q & Q2, M> {
    return this.include(ApiFragment.query(query));
  }

  /**
   * Appends mutations to this `ApiFragment`.
   *
   * A new fragment is returned - `ApiFragments` are never mutated.
   *
   * @param mutation methods available on this fragment.
   */
  public mutation<M2 extends Methods>(mutation: M2): ApiFragment<I, Q, M & M2> {
    return this.include(ApiFragment.mutation(mutation));
  }

  // Can't figure out how to do this miultiplication over a tuple of arbitrary arity.
  // for now, we permutate it a bunch of times - should not impact the developer experience.
  public include<F1 extends ApiFragment<{}, {}, {}>>(fragment: F1): ApiFragment<
    I & F1['Types'],
    Q & F1['Query'],
    M & F1['Mutation']
  >;

  public include<
    F1 extends ApiFragment<{}, {}, {}>,
    F2 extends ApiFragment<{}, {}, {}>,
  >(
    f1: F1,
    f2: F2
  ): ApiFragment<
    F1['Types'] & F2['Types'],
    F1['Query'] & F2['Query'],
    F1['Mutation'] & F2['Mutation']
  >;

  public include<
    F1 extends ApiFragment<{}, {}, {}>,
    F2 extends ApiFragment<{}, {}, {}>,
    F3 extends ApiFragment<{}, {}, {}>,
  >(
    f1: F1,
    f2: F2,
    f3: F3,
  ): ApiFragment<
    F1['Types'] & F2['Types'] & F3['Types'],
    F1['Query'] & F2['Query'] & F3['Query'],
    F1['Mutation'] & F2['Mutation'] & F3['Mutation']
  >;

  public include<
    F1 extends ApiFragment<{}, {}, {}>,
    F2 extends ApiFragment<{}, {}, {}>,
    F3 extends ApiFragment<{}, {}, {}>,
    F4 extends ApiFragment<{}, {}, {}>,
  >(
    f1: F1,
    f2: F2,
    f3: F3,
    f4: F4
  ): ApiFragment<
    F1['Types'] & F2['Types'] & F3['Types'] & F4['Types'],
    F1['Query'] & F2['Query'] & F3['Query'] & F4['Query'],
    F1['Mutation'] & F2['Mutation'] & F3['Mutation'] & F4['Mutation']
  >;

  /**
   * Coalesce this fragment with a collection of other fragments.
   */
  public include<F extends ApiFragment<{}, {}, {}>[]>(
    ...fragments: F
  ): ApiFragment<{}, {}, {}> {
    const implIndex: TypeIndex = {};
    const query = {};
    const mutation = {};
    for (const fragment of fragments) {
      Object.entries(fragment.query).forEach(([key, value]) => (query as any)[key] = value);
      Object.entries(fragment.mutation).forEach(([key, value]) => (mutation as any)[key] = value);

      for (const [fqn, impl] of Object.entries(fragment.Types)) {
        const prev = implIndex[fqn];
        const i = (impl as Resolvers);
        if (prev !== undefined) {
          implIndex[fqn] = {
            type: i.type,
            fields: (self: any) => {
              const a = prev.fields(self);
              const b = i.fields(self);
              return {
                ...a,
                ...b
              };
            }
          };
        } else {
          implIndex[fqn] = i;
        }
      }
    }
    return new ApiFragment({
      types: implIndex,
      mutation,
      query
    });
  }
}
