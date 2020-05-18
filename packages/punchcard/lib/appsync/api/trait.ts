import { RecordMembers, RecordShape } from '@punchcard/shape';
import { ApiFragment } from './api-fragment';
import { AuthMetadata } from './auth';
import { CacheMetadata } from './caching';
import { FieldResolver } from './resolver';
import { MutationRoot, QueryRoot, SubscriptionRoot } from './root';
import { SubscriptionImpl } from './subscription';
import { TypeSystem } from './type-system';

export interface FixedTraitClass<
  T extends RecordShape<any, string>,
  F extends RecordMembers,
> {
  readonly type: T;
  readonly fields: F

  new(impl: TraitImpl<T, F, boolean>): TraitFragment<T, F>;
}

export interface TraitClass<
  Fields extends RecordMembers,
  ReturnsValue extends boolean = true
> {
  readonly fields: Fields;
  new<T extends RecordShape<any, string>>(type: T, impl: TraitImpl<T, Fields, ReturnsValue>): TraitFragment<T, Fields>;
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
    return class Fragment extends TraitFragment<typeof type, typeof fields>  {
      // public static readonly type: T = type;
      public static readonly fields: typeof fields = fields;

      constructor(impl: TraitImpl<typeof type, typeof fields>) {
        super(type! as any, fields, impl);
      }
    };
  } else {
    const fields = a as RecordMembers;
    return class Fragment<T extends RecordShape<any, string>> extends TraitFragment<T, typeof fields>  {
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

/**
 * A Trait Fragment
 */
export class TraitFragment<
  T extends RecordShape<any, string>,
  F extends RecordMembers
> extends ApiFragment<{
  [fqn in T['FQN']]: {
    type: T;
    fields: F & T['Members'];
    resolvers: TraitImpl<T, F>;
  };
} & TypeSystem & TypeSystem.Collect<F>> {
  constructor(
    public readonly type: T,
    public readonly fields: F,
    public readonly resolvers: TraitImpl<T, F> | SubscriptionImpl<F>
  ) {
    super({
      ...{
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
        },
      },
      ...{
        [type.FQN]: {
          type,
          fields,
          resolvers
        },
      }
    } as any);
  }
}
