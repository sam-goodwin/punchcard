import iam = require('@aws-cdk/aws-iam');

import { Assembly, Namespace } from '../core/assembly';
import { Cache } from '../core/cache';
import { HList } from '../util/hlist';
import { Client, Clients } from './client';

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
   *
   * @param namespace property namespace
   * @param grantable principal to grant permissions to
   */
  install(namespace: Namespace, grantable: iam.IGrantable): void;
  /**
   * Bootstrap the runtime interface of a construct.
   *
   * @param namespace property namespace
   * @param cache a cache of state shared by all clients at runtime.
   */
  bootstrap(namespace: Namespace, cache: Cache): Promise<C>;
}

export namespace Dependency {
  export type None = typeof none;
  export const none: Dependency<{}> = {
    [Symbol.for('punchcard:dependency:none')]: true,
    bootstrap: async () => ({}),
    install: () => undefined
  };

  export function tuple<T extends any[]>(...deps: T): Tuple<T> {
    return new Tuple(deps);
  }

  export class Tuple<T extends any[]> implements Dependency<Clients<HList<T>>> {
    constructor(private readonly deps: T) {}

    public install(namespace: Namespace, grantable: iam.IGrantable): void {
      this.deps.forEach((d, i) => d.install(namespace.namespace(i.toString()), grantable));
    }

    public async bootstrap(namespace: Assembly, cache: Cache): Promise<Clients<HList<T>>> {
      return await Promise.all(this.deps.map((d, i) => d.bootstrap(namespace.namespace(i.toString()), cache))) as any;
    }
  }

  export type NamedDeps = {[name: string]: Dependency<any>};
  export type NamedClients<D extends NamedDeps> = {
    [name in keyof D]: Client<D[name]>;
  };

  export class Named<D extends {[name: string]: Dependency<any>}> implements Dependency<NamedClients<D>> {
    constructor(private readonly dependencies: D) {}

    public install(namespace: Namespace, grantable: iam.IGrantable): void {
      for (const [name, dep] of Object.entries(this.dependencies)) {
        dep.install(namespace.namespace(name), grantable);
      }
    }

    public async bootstrap(properties: Assembly, cache: Cache): Promise<{ [name in keyof D]: Client<D[name]>; }> {
      const client: any = {};
      const deps = await Promise.all(Object
        .entries(this.dependencies)
        .map(async ([name, dep]) => {
          return [name, await dep.bootstrap(properties.namespace(name), cache)];
        }));
      for (const [name, dep] of deps) {
        client[name] = dep;
      }
      return client;
    }
  }
}
