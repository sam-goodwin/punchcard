import { TypeSpec, TypeSystem } from './type-system';

export class ApiFragment<I extends TypeSystem = any> {
  public static join<F1 extends ApiFragment>(
    fragment: F1
  ): ApiFragment<
    F1['Types']
  >;

  public static join<
    F1 extends ApiFragment,
    F2 extends ApiFragment,
  >(
    f1: F1,
    f2: F2,
  ): ApiFragment<
    F1['Types'] & F2['Types']
  >;

  public static join<
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

  public static join<
    F1 extends ApiFragment,
    F2 extends ApiFragment,
    F3 extends ApiFragment,
    F4 extends ApiFragment
  >(
    f1: F1,
    f2: F2,
    f3: F3,
    f4: F4,
  ): ApiFragment<
    F1['Types'] & F2['Types'] & F3['Types'] & F4['Types']
  >;

  public static join<F extends ApiFragment[]>(...fragments: F): ApiFragment {
    return new ApiFragment({}).include(...fragments);
  }

  constructor(public readonly Types: I) {}

  // Can't figure out how to do this miultiplication over a tuple of arbitrary arity.
  // for now, we permutate it a bunch of times - should not impact the developer experience.
  public include<
    F1 extends ApiFragment
  >(f1: F1): ApiFragment<
    I & F1['Types']
  >;

  public include<
    F1 extends ApiFragment,
    F2 extends ApiFragment,
  >(
    f1: F1,
    f2: F2
  ): ApiFragment<
    I & F1['Types'] & F2['Types']
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
    I & F1['Types'] & F2['Types'] & F3['Types']
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
    I & F1['Types'] & F2['Types'] & F3['Types'] & F4['Types']
  >;

  public include<
    F1 extends ApiFragment,
    F2 extends ApiFragment,
    F3 extends ApiFragment,
    F4 extends ApiFragment,
    F5 extends ApiFragment,
  >(
    f1: F1,
    f2: F2,
    f3: F3,
    f4: F4,
    f5: F5
  ): ApiFragment<
    I & F1['Types'] & F2['Types'] & F3['Types'] & F4['Types'] & F5['Types']
  >;

  /**
   * Coalesce this fragment with a collection of other fragments.
   */
  public include<F extends ApiFragment[]>(
    ...fragments: F
  ): ApiFragment;

  /**
   * Coalesce this fragment with a collection of other fragments.
   */
  public include<F extends ApiFragment[]>(
    ...fragments: F
  ): ApiFragment {
    const implIndex: TypeSystem = {};
    for (const fragment of fragments) {
      for (const typeSpec of Object.values(fragment.Types) as TypeSpec[]) {
        const prev = implIndex[typeSpec.type.FQN];
        if (prev !== undefined) {
          implIndex[typeSpec.type.FQN] = {
            type: typeSpec.type,
            fields: {
              ...prev.fields,
              ...typeSpec.fields
            },
            resolvers: {
              ...prev.resolvers,
              ...typeSpec.resolvers
            }
          };
        } else {
          implIndex[typeSpec.type.fqn] = typeSpec;
        }
      }
    }
    return new ApiFragment(implIndex);
  }
}
