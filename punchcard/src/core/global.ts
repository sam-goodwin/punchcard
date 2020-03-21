// import type * as cdk from '@aws-cdk/core';

import {Entrypoint} from "./entrypoint";
import {GLOBAL_SYMBOL_NAME} from "../util";
// import { Build } from './build';

interface State {
  entrypoints: {
    [entrypointId: string]: Entrypoint;
  };
  idCounter: number;
}

const symbol = Symbol.for(GLOBAL_SYMBOL_NAME);
const state: State = ((): State => {
  // eslint-disable-next-line security/detect-object-injection
  let s: State = (global as any)[symbol];
  if (!s) {
    s = {
      entrypoints: {},
      idCounter: 0,
    };
    // eslint-disable-next-line security/detect-object-injection
    (global as any)[symbol] = s;
  }
  return s;
})();

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Global {
  // eslint-disable-next-line no-inner-declarations
  export function clear(): void {
    state.idCounter = 0;
    state.entrypoints = {};
  }

  // eslint-disable-next-line no-inner-declarations
  export function addEntrypoint(e: Entrypoint): string {
    state.idCounter += 1;
    const id = state.idCounter.toString();
    // eslint-disable-next-line security/detect-object-injection
    state.entrypoints[id] = e;
    return id;
  }

  // eslint-disable-next-line no-inner-declarations
  export function getEntrypint(id: string): Entrypoint {
    const e = tryGetEntrypint(id);
    if (e === undefined) {
      throw new Error(`no entrypoint with id '${id}' exists`);
    }
    return e;
  }

  // eslint-disable-next-line no-inner-declarations
  export function tryGetEntrypint(id: string): Entrypoint | undefined {
    // eslint-disable-next-line security/detect-object-injection
    return state.entrypoints[id];
  }
}
