import { Cons, Head, HList } from './hlist';
import { Cache, PropertyBag } from './property-bag';
import { Runtime } from './runtime';

/**
 * Maps a `Dependency` to its runtime representation.
 *
 * i.e. the result of boostrapping a `Client` at runtime.
 */
export type Client<D> =
  D extends Dependency<infer C> ? C :
  D extends undefined ? undefined :
  never;

export type Clients<D extends any[]> = { [K in keyof D]: Client<D[K]>; };

/**
 * A dependency that may be installed into a `Runtime`.
 *
 * @typeparam C type of the client created at runtime.
 */
export interface Dependency<C> {
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

export namespace Dependency {
  export type None = typeof none;
  export const none: Dependency<{}> = {
    [Symbol.for('punchcard:dependency:none')]: true,
    bootstrap: () => ({}),
    install: () => undefined
  };

  export function list<T extends any[]>(...deps: T): List<T> {
    return new List(deps);
  }

  export class List<T extends any[]> implements Dependency<Clients<HList<T>>> {
    constructor(private readonly deps: T) {}
    public install(target: Runtime): void {
      this.deps.forEach((d, i) => d.install(target.namespace(i.toString())));
    }
    public bootstrap(properties: PropertyBag, cache: Cache): Clients<HList<T>> {
      return this.deps.map((d, i) => d.bootstrap(properties.namespace(i.toString()), cache)) as any;
    }
  }

  export type NamedDeps = {[name: string]: Dependency<any>};
  export type NamedClients<D extends NamedDeps> = {
    [name in keyof D]: Client<D[name]>;
  };

  export class Named<D extends {[name: string]: Dependency<any>}> implements Dependency<NamedClients<D>> {
    constructor(private readonly dependencies: D) {}

    public install(target: Runtime): void {
      for (const [name, dep] of Object.entries(this.dependencies)) {
        dep.install(target.namespace(name));
      }
    }

    public bootstrap(properties: PropertyBag, cache: Cache): { [name in keyof D]: Client<D[name]>; } {
      const client: any = {};
      for (const [name, dep] of Object.entries(this.dependencies)) {
        client[name] = dep.bootstrap(properties.namespace(name), cache);
      }
      return client;
    }
  }
}
