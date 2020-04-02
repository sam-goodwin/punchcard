
import { Pointer, RecordMembers, RecordShape, ShapeGuards } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { ApiFragment } from './fragment';
import { VObject } from './types/object';

/**
 * Defines a Trait for some type.
 *
 * @param type to define the trait for - must be a Record.
 * @param fields new fields to associate with the type.
 */
export function Trait<T extends RecordShape, F extends RecordMembers>(
  type: T,
  fields: F
): TraitClass<T, F> {
  return class extends TraitFragment<T, F>  {
    public static readonly type: T = type;
    public static readonly fields: F = fields;

    constructor(impl: TraitImpl<T, F>) {
      super(type, fields, impl);
    }
  };
}

export interface TraitClass<T extends RecordShape, F extends RecordMembers> {
  readonly type: T;
  readonly fields: F

  new (impl: TraitImpl<T, F>): TraitFragment<T, F>
}

/**
 * A Trait Fragment
 */
export class TraitFragment<T extends RecordShape, F extends RecordMembers> extends ApiFragment<{
  [fqn in T['FQN']]: {
    type: T;
    fields: F;
    impl: TraitImpl<T, F>;
  };
}> {
  constructor(
    public readonly type: T,
    public readonly fields: F,
    public readonly impl: TraitImpl<T, F>
  ) {
    super({
      [type.FQN]: {
        type,
        fields,
        impl
      }
    } as any);
  }
}

/**
 * Implementation of the field resolvers in a Trait.
 */
export type TraitImpl<T extends RecordShape, F extends RecordMembers> = {
  [f in keyof F]: F[f] extends FunctionShape<infer Args, infer Returns> ?
    // if it's a Function type, expect a function taking those args and returning an object
    (
      args: {
        [arg in keyof Args]: VObject.Of<Args[arg]>;
      },
      self: VObject.Of<Pointer.Resolve<T>> // self is passed as the last argument so it can be easily ignored in favor of `this`
    ) => Generator<unknown, VObject.Of<Returns>> :
    // no args if it is not a Function type
    (
      self: VObject.Of<T> // self is passed as the last argument so it can be easily ignored in favor of `this`
    ) => Generator<unknown, VObject.Of<F[f]>>
} & ThisType<VObject.Of<T>> // make the value of self also available as `this`. (optional syntactic sugar).
;

/**
 * A map from a type's FQN to its field-level resolvers.
 */
export type TraitImplIndex = {
  [fqn in string]: {
    type: RecordShape<{}, fqn>;
    fields: RecordMembers;
    impl: TraitImpl<RecordShape<{}, fqn>, {}>;
  };
};

