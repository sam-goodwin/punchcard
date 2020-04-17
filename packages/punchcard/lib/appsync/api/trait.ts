import { RecordMembers, RecordShape, Shape } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { VTL } from '../lang/vtl';
import { VObject } from '../lang/vtl-object';
import { ApiFragment } from './api-fragment';
import { CachingKeys } from './caching';
import { MutationRoot } from './mutation';
import { QueryRoot } from './query';
import { SubscriptionRoot } from './subscription';
import { TypeSystem } from './type-system';

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
): T extends undefined ? TraitClass<F> : FixedTraitClass<Exclude<T, undefined>, F> {
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

export interface TraitClass<
  Fields extends RecordMembers
> {
  readonly fields: Fields
  new<T extends RecordShape<any, string>>(type: T, impl: TraitImpl<T, Fields>): TraitFragment<T, Fields>
}

export interface FixedTraitClass<
  T extends RecordShape<any, string>,
  F extends RecordMembers,
> {
  readonly type: T;
  readonly fields: F

  new(impl: TraitImpl<T, F>): TraitFragment<T, F>
}

export interface CacheMetadata<T extends Shape> {
  readonly cache?: {
    readonly ttl: number;
    /**
     * Keys to cache on.
     *
     * Can include arguments and keys from `$context.identity`
     */
    readonly keys: (T extends FunctionShape<infer Args, any> ?
      keyof Args | CachingKeys :
      CachingKeys
    )[];
  },
}

export enum AuthMode {
  AMAZON_COGNITO_USER_POOLS = 'AMAZON_COGNITO_USER_POOLS',
  AWS_IAM = 'AWS_IAM',
  NONE = 'NONE',
  OPENID_CONNECT = 'OPENID_CONNECT',
}

/**
 * @see https://docs.aws.amazon.com/appsync/latest/devguide/security.html#using-additional-authorization-modes
 */
export interface AuthMetadata {
  readonly auth?: {
    aws_cognito_user_pools: true | {
      groups: string[];
    };
  } | {
    aws_iam: true;
  } | {
    aws_api_key: true;
  } | {
    aws_oidc: true;
  },
}

export type TraitResolver<Self extends RecordShape, T extends Shape> = ThisType<VObject.Of<Self>> & {
  readonly resolve: T extends FunctionShape<infer Args, infer Returns> ?
    // if it's a Function type, expect a function taking those args and returning an object
    (args: { [arg in keyof Args]: VObject.Of<Args[arg]>; }, self: VObject.Of<Self>) => VTL<VObject.Of<Returns>> :
    // no args if it is not a Function type
    (self: VObject.Of<Self>) => VTL<VObject.Of<T>>;
};

/**
 * Implementation of the field resolvers in a Trait.
 */
export type TraitImpl<
  Self extends RecordShape,
  Fields extends RecordMembers
> = {
  [f in keyof Fields]:
    AuthMetadata &
    CacheMetadata<Fields[f]> &
    TraitResolver<Self, Fields[f]>
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
} & TypeSystem.DefaultTypes & TypeSystem.Collect<F>> {
  constructor(
    public readonly type: T,
    public readonly fields: F,
    public readonly resolvers: TraitImpl<T, F>
  ) {
    super({
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
      [type.FQN]: {
        type,
        fields,
        resolvers
      },
    } as any);
  }
}
