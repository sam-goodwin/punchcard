import { Record, RecordMembers, Shape } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { Subscribe } from '../lang';
import { VTL } from '../lang/vtl';
import { VObject } from '../lang/vtl-object';
import { AuthMetadata, CacheMetadata, Trait, TraitFragment } from './trait';

export class SubscriptionRoot extends Record('Subscription', {}) {}
export namespace SubscriptionRoot {
  export type FQN = typeof SubscriptionRoot.FQN;
}

export interface SubscriptionTraitClass<
  F extends RecordMembers,
> {
  readonly fields: F
  readonly type: typeof SubscriptionRoot;

  new(impl: SubscriptionImpl<F>): TraitFragment<typeof SubscriptionRoot, F>
}

export type SubscriptionImpl<
  Fields extends RecordMembers
> = {
  [f in keyof Fields]:
    AuthMetadata &
    CacheMetadata<Fields[f]> &
    SubscriptionResolver<Fields[f]>
  ;
};

export interface SubscriptionResolver<T extends Shape> {
  subscribe: Subscribe<T> | Subscribe<T>[];
  resolve?: T extends FunctionShape<infer Args, any> ?
    (args: { [arg in keyof Args]: VObject.Of<Args[arg]>; }) => VTL<void> :
    () => VTL<void>
  ;
}

export function Subscription<F extends RecordMembers = RecordMembers>(fields: F): SubscriptionTraitClass<F> {
  return Trait(fields, SubscriptionRoot) as any;
}
