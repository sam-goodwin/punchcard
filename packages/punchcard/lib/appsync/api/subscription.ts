import { DistributeUnionShape, Fields, Shape, UnionShape } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { Subscribe } from '../lang';
import { ApiFragment } from './api-fragment';
import { SubscriptionRoot } from './root';
import { Trait, TraitImpl } from './trait';

export interface SubscriptionTraitClass<
  F extends Fields,
> {
  readonly fields: F
  readonly type: typeof SubscriptionRoot;

  new(impl: SubscriptionImpl<F>): ApiFragment<typeof SubscriptionRoot, F>
}
export function Subscription<F extends Fields = Fields>(fields: F): SubscriptionTraitClass<F> {
  return class extends Trait(SubscriptionRoot, fields) {
    public static readonly fields = fields;
    public static readonly type = SubscriptionRoot;

    constructor(impl: SubscriptionImpl<F>) {
      super(impl);
    }
  };
}

export type SubscriptionImpl<
  F extends Fields
> = {
  [f in keyof TraitImpl<typeof SubscriptionRoot, F, false>]:
    & TraitImpl<typeof SubscriptionRoot, F, false>[f]
    & SubscribeMetadata<F[f]>
};

export interface SubscribeMetadata<T extends Shape> {
  subscribe: T extends FunctionShape<any, infer Returns> ?
    | Subscribe<DistributeUnionShape<Returns>>
    | Subscribe<DistributeUnionShape<Returns>>[]
    :
    | Subscribe<DistributeUnionShape<T>>
    | Subscribe<DistributeUnionShape<T>>[]
  ;
}
