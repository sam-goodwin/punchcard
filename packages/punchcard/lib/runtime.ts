import iam = require('@aws-cdk/aws-iam');
import { ENTRYPOINT_SYMBOL_NAME } from './constants';
import { Cache, PropertyBag } from './property-bag';

/**
 * A `Runtime` is an abstract compute container, such as an AWS Lambda Function, EC2 Instance
 * or Docker Container.
 *
 * It encapsulates the grantable principal and properties, so that a client can add
 * permissions and runtime-side properties it needs to function. For example, a `dynamodb.Table`
 * construct might grant read permissions and add the `tableName` property so that it
 * may (at runtime) create an instance for fetching data from the table.
 */
export interface Runtime {
  properties: PropertyBag;
  grantable: iam.IGrantable;
}

/**
 * A set of named clients to be made available in a `Runtime`.
 */
export type ClientContext = {
  [name: string]: Client<any>
};

/**
 * Maps a `ClientContext` to its runtime representation, i.e. the result
 * of boostrapping each `Client` at runtime.
 */
export type Clients<C extends ClientContext> = {
  [name in keyof C]: C[name] extends Client<infer R> ? R : never;
};

/**
 * A client that may be installed into a `Runtime`.
 *
 * @typeparam C type of the client created at runtime.
 */
export interface Client<C> {
  /**
   * Install a Client instance into a target:
   * * grant required permissions
   * * add properties required at runtime
   * @param target
   */
  install(target: Runtime): void;
  /**
   * Bootstrap the runtime interface of a construct.
   * @param properties a bag of properties
   * @param cache a cache of state shared by all clients at runtime
   */
  bootstrap(properties: PropertyBag, cache: Cache): C;
}

export const entrypoint = Symbol.for(ENTRYPOINT_SYMBOL_NAME);
/**
 * An entrypoint handler.
 */
export interface Entrypoint {
  /**
   * Symbol for unambigious runtime detection.
   */
  [entrypoint]: true;
  /**
   * Create a handler.
   *
   * This is where you create clients and any other state required by the entrypoint.
   */
  boot(): Promise<(event: any, context: any) => Promise<any>>;
}
export namespace Entrypoint {
  /**
   * Determine if an instance is an `Entrypoint`.
   * @param a instance to check
   */
  export function isEntrypoint(a: any): a is Entrypoint {
    return a[entrypoint] === true;
  }
}
