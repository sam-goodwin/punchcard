import cdk = require('@aws-cdk/core');
import { Build } from './build';
import { Entrypoint } from './entrypoint';

export class App {
  public readonly root: Build<cdk.App>;

  constructor() {
    this.root = Build.lazy(() => new cdk.App({
      autoSynth: false
    }));
    if (process.env.is_runtime !== 'true') {
      process.once('beforeExit', () => {
        // resolve all Build closures and synth the app if this isn't runtime.
        Build.walk(this.root);
        const app = Build.resolve(this.root);
        app.synth();
      });
    }
  }
}

interface State {
  idCounter: number;
  entrypoints: {
    [entrypointId: string]: Entrypoint;
  }
}

const symbol = Symbol.for('punchcard.global');
const state: State = (() => {
  let s: State = (global as any)[symbol];
  if (!s) {
    s = {
      idCounter: 0,
      entrypoints: {}
    };
    (global as any)[symbol] = s;
  }
  return s;
})();

export namespace Global {
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