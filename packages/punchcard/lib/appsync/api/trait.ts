import { Fields, RecordShape } from '@punchcard/shape';
import { ApiFragment } from './api-fragment';
import { AuthMetadata } from './auth';
import { CacheMetadata } from './caching';
import { FieldResolver } from './resolver';

export interface FixedTraitClass<
  T extends RecordShape<any, string>,
  F extends Fields,
> {
  readonly type: T;
  readonly fields: F

  new(impl: TraitImpl<T, F, boolean>): ApiFragment<T, F>;
}

export interface TraitClass<
  F extends Fields,
  ReturnsValue extends boolean = true
> {
  readonly fields: F;
  new<T extends RecordShape<any, string>>(type: T, impl: TraitImpl<T, F, ReturnsValue>): ApiFragment<T, F>;
}

export function Trait<
  T extends RecordShape<any, string> = RecordShape<any, string>,
  F extends Fields = Fields
>(
  type: T,
  fields: F,
): FixedTraitClass<T, F>;

export function Trait<
  F extends Fields = Fields,
>(
  fields: F,
): TraitClass<F>;

export function Trait(a: any, b?: any): any {
  if (b !== undefined) {
    const type = a as RecordShape<any, string>;
    const fields = b as Fields;
    return class Fragment extends ApiFragment<typeof type, typeof fields>  {
      // public static readonly type: T = type;
      public static readonly fields: typeof fields = fields;

      constructor(impl: TraitImpl<typeof type, typeof fields>) {
        super(type! as any, fields, impl);
      }
    };
  } else {
    const fields = a as Fields;
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
  F extends Fields,
  ReturnsValue extends boolean = true
> = {
  [f in keyof F]:
    & AuthMetadata
    & CacheMetadata<F[f]>
    & FieldResolver<Self, F[f], ReturnsValue>
  ;
};


