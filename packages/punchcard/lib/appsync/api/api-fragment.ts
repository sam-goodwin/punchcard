import { RecordShape, Shape, ShapeGuards } from '@punchcard/shape';
import { MutationRoot, QueryRoot, SubscriptionRoot } from './root';
import { TypeSpec, TypeSystem } from './type-system';

type DefaultTypes = {
  'Mutation': TypeSpec;
  'Query': TypeSpec;
  'Subscription': TypeSpec;
};

export class ApiFragment<I extends TypeSystem = DefaultTypes> {
  public static concat<F1 extends ApiFragment>(
    fragment: F1
  ): ApiFragment<
    F1['Types'] & DefaultTypes
  >;

  public static concat<
    F1 extends ApiFragment,
    F2 extends ApiFragment,
  >(
    f1: F1,
    f2: F2,
  ): ApiFragment<
    F1['Types'] & F2['Types'] & DefaultTypes
  >;

  public static concat<
    F1 extends ApiFragment,
    F2 extends ApiFragment,
    F3 extends ApiFragment,
  >(
    f1: F1,
    f2: F2,
    f3: F3,
  ): ApiFragment<
    F1['Types'] & F2['Types'] & F3['Types'] & DefaultTypes
  >;

  public static concat<
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
    F1['Types'] & F2['Types'] & F3['Types'] & F4['Types'] & DefaultTypes
  >;

  public static concat<
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
    F5: F5,
  ): ApiFragment<
    F1['Types'] & F2['Types'] & F3['Types'] & F4['Types'] & F5['Types'] & DefaultTypes
  >;

  public static concat<F extends ApiFragment[]>(...fragments: F): ApiFragment {
    return new ApiFragment({
      [MutationRoot.FQN]: {
        type: MutationRoot,
        fields: {},
        resolvers: {}
      },
      [QueryRoot.FQN]: {
        type: QueryRoot,
        fields: {},
        resolvers: {}
      },
      [SubscriptionRoot.FQN]: {
        type: SubscriptionRoot,
        fields: {},
        resolvers: {}
      }
    }).include(...fragments);
  }

  public readonly Types: I;

  constructor(types: I) {
    const _types = types as any;

    emptyDefault(QueryRoot);
    emptyDefault(MutationRoot);
    emptyDefault(SubscriptionRoot);

    this.Types = _types;

    function emptyDefault<T extends RecordShape<any, string>>(type: T) {
      if (_types[type.FQN] === undefined) {
        _types[type.FQN] = {
          type,
          fields: {},
          resolvers: {}
        };
      }
    }
  }

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
    I & F1['Types'] & F2['Types'] & F3['Types'] & DefaultTypes
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
    I & F1['Types'] & F2['Types'] & F3['Types'] & F4['Types'] & DefaultTypes
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
    I & F1['Types'] & F2['Types'] & F3['Types'] & F4['Types'] & F5['Types'] & DefaultTypes
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
    const implIndex: TypeSystem = {} as any;
    for (const fragment of fragments) {
      for (const typeSpec of Object.values(fragment.Types) as TypeSpec[]) {
        Object
          .values(typeSpec.fields)
          .map(getTypes)
          .reduce((a, b) => a.concat(b), [])
          .forEach(shape => merge({
            type: shape,
            fields: shape.Members,
            resolvers: {}
          }));

        merge(typeSpec);
      }
    }

    function getTypes(shape: Shape): RecordShape<any, string>[] {
      if (ShapeGuards.isFunctionShape(shape)) {
        return getTypes(shape.returns);
      } else if (ShapeGuards.isArrayShape(shape)) {
        return getTypes(shape.Items);
      } else if (ShapeGuards.isRecordShape(shape) && shape.FQN !== undefined) {
        return Object
          .values(shape.Members)
          .map(m => getTypes(m as any))
          .reduce((a, b) => a.concat(b))
          .concat([shape] as any);
      }
      return [];
    }

    function merge(typeSpec: TypeSpec) {
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
        implIndex[typeSpec.type.FQN] = typeSpec;
      }
    }

    return new ApiFragment(implIndex) as any;
  }
}
