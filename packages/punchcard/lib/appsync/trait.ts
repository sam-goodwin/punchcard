
import { RecordMembers, RecordShape } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { ApiFragment } from './fragment';
import { TypeSystem } from './type-system';
import { VTL } from './vtl';
import { VObject } from './vtl-object';

/**
 * Defines a Trait for some type.
 *
 * @param type to define the trait for - must be a Record.
 * @param fields new fields to associate with the type.
 */
export function Trait<T extends RecordShape<any, string>, F extends RecordMembers>(
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

export interface TraitClass<T extends RecordShape<any, string>, F extends RecordMembers> {
  readonly type: T;
  readonly fields: F

  new (impl: TraitImpl<T, F>): TraitFragment<T, F>
}

/**
 * A Trait Fragment
 */
export class TraitFragment<T extends RecordShape<any, string>, F extends RecordMembers> extends ApiFragment<{
  [fqn in T['FQN']]: {
    type: T;
    fields: F & T['Members'];
    resolvers: TraitImpl<T, F>;
  };
} & TypeSystem.Collect<F>> {
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
    (args: {
      [arg in keyof Args]: VObject.Of<Args[arg]>;
    }, self: VObject.Of<T>) => VTL<VObject.Of<Returns>> :
    // no args if it is not a Function type
    (self: VObject.Of<T>) => VTL<VObject.Of<F[f]>>
} & ThisType<VObject.Of<T>> // make the value of self also available as `this`. (optional syntactic sugar).
;
