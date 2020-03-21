import {Build} from "./build";
import {Run} from "./run";

/**
 * Dual.
 */
export class Dual<B, R> {
  constructor(public readonly build: Build<B>, public readonly run: Run<R>) {}

  public buildMap<B2>(f: (b: B) => B2): Dual<B2, R> {
    return new Dual(this.build.map(f), this.run);
  }

  public buildChain<B2>(f: (b: B) => Build<B2>): Dual<B2, R> {
    return new Dual(this.build.chain(f), this.run);
  }

  public runMap<R2>(f: (r: R) => R2): Dual<B, R2> {
    return new Dual(this.build, this.run.map(f));
  }

  public runChain<R2>(f: (r: R) => Run<R2>): Dual<B, R2> {
    return new Dual(this.build, this.run.chain(f));
  }
}
