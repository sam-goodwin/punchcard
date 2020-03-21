import {Dependency} from "./dependency";
/**
 * Maps a `Dependency` to its runtime representation.
 *
 * i.e. the result of boostrapping a `Client` at runtime.
 */
export type Client<D> = D extends Dependency<infer C>
  ? C
  : D extends undefined
  ? undefined
  : never;

export type Clients<D extends any[]> = {[K in keyof D]: Client<D[K]>};
