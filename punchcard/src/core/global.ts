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
  let s: State = (global as any)[symbol];
  if (!s) {
    s = {
      entrypoints: {},
      idCounter: 0,
    };
    (global as any)[symbol] = s;
  }
  return s;
})();

export namespace Global {
  export function clear(): void {
    state.idCounter = 0;
    state.entrypoints = {};
  }

  export function addEntrypoint(e: Entrypoint): string {
    state.idCounter += 1;
    const id = state.idCounter.toString();
    state.entrypoints[id] = e;
    return id;
  }

  export function getEntrypint(id: string): Entrypoint {
    const e = tryGetEntrypint(id);
    if (e === undefined) {
      throw new Error(`no entrypoint with id '${id}' exists`);
    }
    return e;
  }

  export function tryGetEntrypint(id: string): Entrypoint | undefined {
    return state.entrypoints[id];
  }
}
