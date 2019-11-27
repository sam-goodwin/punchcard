import iam = require('@aws-cdk/aws-iam');

import { Assembly, Namespace } from '../core/assembly';
import { Cache } from '../core/cache';
import { Cons, Head, HList, Tail } from '../util/hlist';
import { Client, Clients } from './client';

import { Build } from './build';
import { Run } from './run';

export interface Dependency<D> {
  install: Build<Install>;
  bootstrap: Run<Bootstrap<D>>;
}
export namespace Dependency {
  export type None = typeof none;
  export const none: Dependency<{}> = {
    [Symbol.for('punchcard:dependency:none')]: true,
    bootstrap: Run.of(async () => ({})),
    install: Build.of(() => undefined)
  };

  export function concat<D extends any[]>(...ds: D): Concat<D>;
  export function concat(...ds: Array<Dependency<any>>): Dependency<any[]> {
    return {
      install:  Build
        .concat(...ds.map(_ => _.install))
        .map(is => (ns, grantable) => (is as any).forEach((i: any) => i(ns, grantable))),
      bootstrap: Run
        .concat(...ds.map(_ => _.bootstrap))
        .map(bs => (ns, cache) => Promise.all((bs as any).map((bootstrap: any) => bootstrap(ns, cache) ))),
    };
  }

  export type Concat<T extends any[]> = Dependency<Clients<HList<T>>>;
}

export type Install = (namespace: Namespace, grantable: iam.IGrantable) => void;
export type Bootstrap<D> = (namespace: Namespace, cache: Cache) => Promise<D>;
