import { Shape } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { ApiFragment, ApiFragments } from './api-fragment';
import { TypeSystem } from './type-system';

export type CachingKeys =
  | '$context.identity.accountId'
  | '$context.identity.cognitoIdentityAuthProvider'
  | '$context.identity.cognitoIdentityAuthType'
  | '$context.identity.cognitoIdentityId'
  | '$context.identity.cognitoIdentityPoolId'
  | '$context.identity.defaultAuthStrategy'
  | '$context.identity.issuer'
  | '$context.identity.sourceIp '
  | '$context.identity.sub '
  | '$context.identity.user'
  | '$context.identity.userArn'
  | '$context.identity.username'
;

export enum CachingBehavior {
  FULL_REQUEST_CACHING = 'FULL_REQUEST_CACHING',
  PER_RESOLVER_CACHING = 'PER_RESOLVER_CACHING'
}

export enum CachingInstanceType {
  /**
   * A t2.small instance type.
   */
  T2_SMALL = 'T2_SMALL',
  /**
   * A t2.medium instance type.
   */
  T2_MEDIUM = 'T2_MEDIUM',
  /**
   * A r4.large instance type.
   */
  R4_LARGE = 'R4_LARGE',
  /**
   * A r4.xlarge instance type.
   */
  R4_XLARGE = 'R4_XLARGE',
  /**
   * A r4.2xlarge instance type.
   */
  R4_2XLARGE = 'R4_2XLARGE',
  /**
   * A r4.4xlarge instance type.
   */
  R4_4XLARGE = 'R4_4XLARGE',
  /**
   * A r4.8xlarge instance type.
   */
  R4_8XLARGE = 'R4_8XLARGE',
}
/**
 * @see https://docs.aws.amazon.com/appsync/latest/devguide/enabling-caching.html
 */
export interface CachingConfiguration {
  /**
   * Caching Behavior.
   */
  readonly behavior: CachingBehavior;
  /**
   * @default true
   */
  readonly atRestEncryptionEnabled?: boolean;
  /**
   * @default true
   */
  readonly transitEncryptionEnabled?: boolean;
  /**
   * The cache instance type.
   */
  readonly instanceType: CachingInstanceType;
  /**
   * TTL in seconds for cache entries.
   *
   * Valid values are between `1` and `3600` seconds.
   */
  readonly ttl: number;
}

export interface CacheMetadata<T extends Shape> {
  readonly cache?: {
    /**
     * TTL of items in the cache.
     *
     * Maximum: 1
     * Minimum: 3600
     */
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

