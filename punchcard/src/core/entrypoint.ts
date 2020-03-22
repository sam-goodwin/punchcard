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

export namespace Entrypoint {
  /**
   * Determine if an instance is an `Entrypoint`.
   * @param a - instance to check
   */
  export function isEntrypoint(a: any): a is Entrypoint {
    return a[entrypoint] === true;
  }
}
