import { RecordShape, Shape } from '@punchcard/shape';
import { ResolverImpl } from './syntax/resolver';
import { VObject } from './types/object';

/**
 * A map from a type's FQN to its field-level resolvers.
 */
export type ShapeIndex = {
  [fqn in string]: {
    type: RecordShape<{}, fqn>;
    fields: ResolverFields;
  };
};

export interface ResolverFields {
  [fieldName: string]: ResolverImpl<{}, Shape>;
}

export class ApiFragment<I extends ShapeIndex = {}> {
  /**
   * Start a new API Fragment by defining a type with field resolvers.
   *
   * @param type type these fields are associated with.
   * @param fields resolved fields to add to this `type`.
   */
  public static new<T extends RecordShape, F extends ResolverFields>(
    type: T,
    fields: F
  ): ApiFragment<{
    [fqn in T['FQN']]: {
      type: T;
      fields: F
    };
  }> {
    return new ApiFragment({
      [type.FQN]: {
        type,
        fields
      }
    });
  }

  constructor(public readonly Types: I) {}

  // Can't figure out how to do this miultiplication over a tuple of arbitrary arity.
  // for now, we permutate it a bunch of times - should not impact the developer experience.
  public include<F1 extends ApiFragment>(fragment: F1): ApiFragment<
    I & F1['Types']
  >;

  public include<
    F1 extends ApiFragment,
    F2 extends ApiFragment,
  >(
    f1: F1,
    f2: F2
  ): ApiFragment<
    F1['Types'] & F2['Types']
  >;

  public include<
    F1 extends ApiFragment,
    F2 extends ApiFragment,
    F3 extends ApiFragment,
  >(
    f1: F1,
    f2: F2,
    f3: F3,
  ): ApiFragment<
    F1['Types'] & F2['Types'] & F3['Types']
  >;

  public include<
    F1 extends ApiFragment,
    F2 extends ApiFragment,
    F3 extends ApiFragment,
    F4 extends ApiFragment,
  >(
    f1: F1,
    f2: F2,
    f3: F3,
    f4: F4
  ): ApiFragment<
    F1['Types'] & F2['Types'] & F3['Types'] & F4['Types']
  >;

  /**
   * Coalesce this fragment with a collection of other fragments.
   */
  public include<F extends ApiFragment[]>(
    ...fragments: F
  ): ApiFragment {
    const implIndex: ShapeIndex = {};
    const query = {};
    const mutation = {};
    for (const fragment of fragments) {
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
