import { Cache, PropertyBag } from "./property-bag";
import { Runtime } from "./runtime";

/**
 * Maps a `Dependency` to its runtime representation.
 *
 * i.e. the result of boostrapping a `Client` at runtime.
 */
export type Client<D extends Dependency<any>> = D extends Dependency<infer C> ? C : never;

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
export namespace Depends {
  export type None = typeof none;
  export const none: Dependency<{}> = {
    [Symbol.for('punchcard:dependency:none')]: true,
    bootstrap: () => ({}),
    install: () => undefined
  };

  export type Union<D1 extends Dependency<any>, D2 extends Dependency<any>> = Dependency<[Client<D1>, Client<D2>]>;

  export type NamedDeps = {[name: string]: Dependency<any>};
  export type NamedClients<D extends NamedDeps> = {
    [name in keyof D]: Client<D[name]>;
  };

  export function on<D extends NamedDeps>(named: D): Named<D>;
  export function on<D1 extends Dependency<any>, D2 extends Dependency<any>>(d1: D1, d2: D2): Depends.Union<D1, D2>;
  // export function on<A, B, C>(a: Dependency<A>, b: Dependency<B>, c: Dependency<C>): Dependency<[A, B, C]>;
  // export function on<A, B, C, D>(a: Dependency<A>, b: Dependency<B>, c: Dependency<C>, d: Dependency<D>): Dependency<[A, B, C, D]>;
  // export function on<A, B, C, D, E>(a: Dependency<A>, b: Dependency<B>, c: Dependency<C>, d: Dependency<D>, e: Dependency<E>): Dependency<[A, B, C, D, E]>;

  export function on(a: any): Dependency<any> {
    if (Array.isArray(a)) {
      return new DependencyList(a);
    } else {
      return new Named(a) as any;
    }
  }

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

  class DependencyList implements Dependency<any> {
    constructor(private readonly dependencies: Array<Dependency<any>>) { }

    public install(target: Runtime): void {
      this.dependencies.forEach((d, i) => {
        d.install(target.namespace(i.toString()));
      });
    }

    public bootstrap(properties: PropertyBag, cache: Cache): Array<Dependency<any>> {
      console.log('bootstrap', properties, cache);
      return this.dependencies.map((d, i) => d.bootstrap(properties.namespace(i.toString()), cache));
    }
  }
}
