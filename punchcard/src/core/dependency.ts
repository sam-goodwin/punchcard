import * as iam from "@aws-cdk/aws-iam";

import {Build} from "./build";
import {Cache} from "../core/cache";
import {Clients} from "./client";
import {HList} from "../util/hlist";
import {Namespace} from "../core/assembly";
import {Run} from "./run";

export interface Dependency<D = any> {
  bootstrap: Run<Bootstrap<D>>;
  install: Build<Install>;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Dependency {
  export type None = typeof none;
  export const none: Dependency<{}> = {
    [Symbol.for("punchcard:dependency:none")]: true,
    // todo: accept synchronous fns as well
    bootstrap: Run.of(() => new Promise((resolve) => resolve())),
    install: Build.of(() => undefined),
  };

  export function concat<D extends any[]>(...ds: D): Concat<D>;
  // eslint-disable-next-line no-inner-declarations
  export function concat(...ds: Dependency<any>[]): Dependency<any[]> {
    return {
      bootstrap: Run.concat(
        ...ds.map((_) => _.bootstrap),
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      ).map((bs) => (ns, cache) =>
        Promise.all((bs as any).map((bootstrap: any) => bootstrap(ns, cache))),
      ),
      install: Build.concat(
        ...ds.map((_) => _.install),
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      ).map((is) => (ns, grantable) =>
        (is as any).forEach((i: any) => i(ns, grantable)),
      ),
    };
  }

  export type Concat<T extends any[]> = Dependency<Clients<HList<T>>>;
}

export type Install = (namespace: Namespace, grantable: iam.IGrantable) => void;
export type Bootstrap<D> = (namespace: Namespace, cache: Cache) => Promise<D>;
