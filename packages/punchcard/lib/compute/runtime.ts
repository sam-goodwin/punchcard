import iam = require('@aws-cdk/aws-iam');
import { ENTRYPOINT_SYMBOL_NAME } from '../constants';
import { PropertyBag } from './property-bag';

/**
 * A `Runtime` is an abstract compute container, such as an AWS Lambda Function, EC2 Instance
 * or Docker Container.
 *
 * It encapsulates the grantable principal and properties, so that a client can add
 * permissions and runtime-side properties it needs to function. For example, a `dynamodb.Table`
 * construct might grant read permissions and add the `tableName` property so that it
 * may (at runtime) create an instance for fetching data from the table.
 */
export class Runtime {
  constructor(
    public readonly properties: PropertyBag,
    public readonly grantable: iam.IGrantable) {}

  public namespace(namespace: string): Runtime {
    return new Runtime(this.properties.namespace(namespace), this.grantable);
  }
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
