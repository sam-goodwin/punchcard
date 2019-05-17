import iam = require('@aws-cdk/aws-iam');
import { ENTRYPOINT_SYMBOL_NAME } from './constants';

export interface RunTarget {
  properties: PropertyBag;
  grantable: iam.IGrantable;
}

export type Context = {
  [name: string]: Run<any>
};

export type RunContext<C extends Context> = {
  [name in keyof C]: C[name] extends Run<infer R> ? R : never;
};

export interface Run<R> {
  install(target: RunTarget): void;
  bootstrap(properties: RuntimePropertyBag): R;
}

export const entrypoint = Symbol.for(ENTRYPOINT_SYMBOL_NAME);
export interface Entrypoint {
  [entrypoint]: true;
  boot(): Promise<(event: any, context: any) => Promise<any>>;
}
export namespace Entrypoint {
  export function isEntrypoint(a: any): a is Entrypoint {
    return a[entrypoint] === true;
  }
}

export class PropertyBag {
  constructor(
    protected readonly namespace: string,
    protected readonly bag: {[key: string]: string}) {}

  public get properties() {
    return {
      ...this.bag
    };
  }
  public push(namespace: string) {
    return new PropertyBag(`${this.namespace}_${namespace}`, this.bag);
  }

  public set(name: string, value: string): void {
    this.bag[this.makeKey(name)] = value;
  }

  public get(name: string): string {
    const v = this.tryGet(name);
    if (v === undefined) {
      throw new Error(`property '${name}' does not exist`);
    }
    return v;
  }

  public tryGet(name: string): undefined | string {
    return this.bag[this.makeKey(name)];
  }

  private makeKey(name: string): string {
    return `${this.namespace}_${name}`;
  }
}

export class RuntimePropertyBag extends PropertyBag {
  constructor(namespace: string, bag: {[key: string]: string}, protected readonly cache: {[key: string]: any}) {
    super(namespace, bag);
  }

  public push(namespace: string): RuntimePropertyBag {
    return new RuntimePropertyBag(`${this.namespace}_${namespace}`, this.bag, this.cache);
  }

  public insertCache(name: string, value: any): void {
    if (this.hasCache(name)) {
      throw new Error(`cache already contains key '${name}'`);
    }
    this.cache[name] = value;
  }

  public hasCache(name: string): boolean {
    return this.cache[name] !== undefined;
  }

  public lookupCache(name: string) {
    const v = this.tryLookupCache(name);
    if (v === undefined) {
      throw new Error(`cache has no entry for '${name}'`);
    }
    return v;
  }

  public tryLookupCache(name: string) {
    return this.cache[name];
  }
}
