import { RecordMembers, RecordShape, Shape } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { ApiFragment } from './fragment';
import { TypeSystem } from './type-system';
import { VTL } from './vtl';
import { VObject } from './vtl-object';
import { Root } from './root';

/**
 * Represents the implementation of a trait.
 *
 * @typeparam Target type the implementation is bound to
 * @typeparam Trait interface that is implemented
 */
export interface Impl<
  Target extends RecordShape<{}, string>,
  Trait extends TraitClass<{}>
> extends TraitFragment<Target, Trait['fields']> {}

/**
 * Defines a Trait for some type.
 *
 * @param fields new fields to associate with the type.
 */
export function Trait<
  F extends RecordMembers = RecordMembers,
  T extends RecordShape<any, string> | undefined = undefined
>(
  fields: F,
  type?: T,
): T extends undefined ? TraitClass<F> : FixedTraitClass<F, Exclude<T, undefined>> {
  if (type) {
    return class Fragment extends TraitFragment<Exclude<T, undefined>, F>  {
      // public static readonly type: T = type;
      public static readonly fields: F = fields;
  
      constructor(impl: TraitImpl<Exclude<T, undefined>, F>) {
        super(type! as any, fields, impl);
      }
    } as any;
  } else {
    return class Fragment<T extends RecordShape<any, string>> extends TraitFragment<T, F>  {
      // public static readonly type: T = type;
      public static readonly fields: F = fields;
  
      constructor(type: T, impl: TraitImpl<T, F>) {
        super(type, fields, impl);
      }
    } as any;
  }
}

export interface FixedTraitClass<
  F extends RecordMembers,
  T extends RecordShape<any, string>
> {
  readonly type: T;
  readonly fields: F

  new(impl: TraitImpl<T, F>): TraitFragment<T, F>
}

export interface TraitClass<
  Fields extends RecordMembers
> {
  readonly fields: Fields

  new<T extends RecordShape<any, string>>(type: T, impl: TraitImpl<T, Fields>): TraitFragment<T, Fields>
}

/**
 * A Trait Fragment
 */
export class TraitFragment<T extends RecordShape<any, string>, F extends RecordMembers> extends ApiFragment<TypeSystem & {
  [fqn in T['FQN']]: {
    type: T;
    fields: F & T['Members'];
    resolvers: TraitImpl<T, F>;
  };
} & TypeSystem.Collect<F>> {
  constructor(
    public readonly type: T,
    public readonly fields: F,
    public readonly resolvers: TraitImpl<T, F>
  ) {
    super({
      [Root.Mutation.FQN]: {
        type: Root.Mutation,
        fields: {},
        resolvers: {}
      },
      [Root.Query.FQN]: {
        type: Root.Query,
        fields: {},
        resolvers: {}
      },
      [Root.Subscription.FQN]: {
        type: Root.Subscription,
        fields: {},
        resolvers: {}
      },
      [type.FQN]: {
        type,
        fields,
        resolvers
      },
    } as any);
  }
}

/**
 * Implementation of the field resolvers in a Trait.
 */
export type TraitImpl<T extends RecordShape, F extends RecordMembers> = {
  [f in keyof F]: F[f] extends FunctionShape<infer Args, infer Returns> ?
    // if it's a Function type, expect a function taking those args and returning an object
    (args: {
      [arg in keyof Args]: VObject.Of<Args[arg]>;
    }, self: VObject.Of<T>) => VTL<VObject.Of<Returns>> :
    // no args if it is not a Function type
    (self: VObject.Of<T>) => VTL<VObject.Of<F[f]>>
} & ThisType<VObject.Of<T>> // make the value of self also available as `this`. (optional syntactic sugar).
;
