import {ENTRYPOINT_SYMBOL_NAME} from "../util/constants";
import {Run} from "./run";

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
   * Entrypoint handler function.
   *
   * This is where you create clients and any other state required by the entrypoint.
   */
  entrypoint: Run<Promise<(event: any, context: any) => Promise<any>>>;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Entrypoint {
  /**
   * Determine if an instance is an `Entrypoint`.
   * @param a - instance to check
   */
  // eslint-disable-next-line no-inner-declarations
  export function isEntrypoint(a: any): a is Entrypoint {
    // eslint-disable-next-line security/detect-object-injection
    return a[entrypoint] === true;
  }
}
