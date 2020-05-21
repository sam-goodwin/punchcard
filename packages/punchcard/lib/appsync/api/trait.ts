import { RecordMembers, RecordShape } from '@punchcard/shape';
import { ApiFragment } from './api-fragment';
import { AuthMetadata } from './auth';
import { CacheMetadata } from './caching';
import { FieldResolver } from './resolver';

export interface FixedTraitClass<
  T extends RecordShape<any, string>,
  F extends RecordMembers,
> {
  readonly type: T;
  readonly fields: F

  new(impl: TraitImpl<T, F, boolean>): ApiFragment<T, F>;
}

export interface TraitClass<
  Fields extends RecordMembers,
  ReturnsValue extends boolean = true
> {
  readonly fields: Fields;
  new<T extends RecordShape<any, string>>(type: T, impl: TraitImpl<T, Fields, ReturnsValue>): ApiFragment<T, Fields>;
}

export function Trait<
  T extends RecordShape<any, string> = RecordShape<any, string>,
  F extends RecordMembers = RecordMembers
>(
  type: T,
  fields: F,
): FixedTraitClass<T, F>;

export function Trait<
  F extends RecordMembers = RecordMembers,
>(
  fields: F,
): TraitClass<F>;

export function Trait(a: any, b?: any): any {
  if (b !== undefined) {
    const type = a as RecordShape<any, string>;
    const fields = b as RecordMembers;
    return class Fragment extends ApiFragment<typeof type, typeof fields>  {
      // public static readonly type: T = type;
      public static readonly fields: typeof fields = fields;

      constructor(impl: TraitImpl<typeof type, typeof fields>) {
        super(type! as any, fields, impl);
      }
    };
  } else {
    const fields = a as RecordMembers;
    return class Fragment<T extends RecordShape<any, string>> extends ApiFragment<T, typeof fields>  {
      // public static readonly type: T = type;
      public static readonly fields: typeof fields = fields;

      constructor(type: T, impl: TraitImpl<T, typeof fields>) {
        super(type, fields, impl);
      }
    };
  }
}

/**
 * Implementation of the field resolvers in a Trait.
 */
export type TraitImpl<
  Self extends RecordShape,
  Fields extends RecordMembers,
  ReturnsValue extends boolean = true
> = {
  [f in keyof Fields]:
    & AuthMetadata
    & CacheMetadata<Fields[f]>
    & FieldResolver<Self, Fields[f], ReturnsValue>
  ;
};


