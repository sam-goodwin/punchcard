import { RecordMembers, Shape, UnionShape } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { Subscribe } from '../lang';
import { SubscriptionRoot } from './root';
import { Trait, TraitFragment, TraitImpl } from './trait';

export interface SubscriptionTraitClass<
  F extends RecordMembers,
> {
  readonly fields: F
  readonly type: typeof SubscriptionRoot;

  new(impl: SubscriptionImpl<F>): TraitFragment<typeof SubscriptionRoot, F>
}
export function Subscription<F extends RecordMembers = RecordMembers>(fields: F): SubscriptionTraitClass<F> {
  return class extends Trait(SubscriptionRoot, fields) {
    public static readonly fields = fields;
    public static readonly type = SubscriptionRoot;

    constructor(impl: SubscriptionImpl<F>) {
      super(impl);
    }
  };
}

export type SubscriptionImpl<
  Fields extends RecordMembers
> = {
  [f in keyof TraitImpl<typeof SubscriptionRoot, Fields, false>]:
    & TraitImpl<typeof SubscriptionRoot, Fields, false>[f]
    & SubscribeMetadata<Fields[f]>
};

type Distribute<T extends Shape> = T extends UnionShape<infer U> ? T | U[keyof U] : T;

export interface SubscribeMetadata<T extends Shape> {
  subscribe: T extends FunctionShape<any, infer Returns> ?
    | Subscribe<Distribute<Returns>>
    | Subscribe<Distribute<Returns>>[]
    :
    | Subscribe<Distribute<T>>
    | Subscribe<Distribute<T>>[]
  ;
}
