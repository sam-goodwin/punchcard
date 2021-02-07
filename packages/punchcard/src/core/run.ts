
import { HList } from '../util/hlist';

const get = Symbol.for('Runtime.get');

/**
 * The Runtime Universe.
 */
export class Run<A> {
  public readonly [get]: () => A;

  public static resolve<T>(r: Run<T>): T {
    return r[get]();
  }

  public static lazy<B>(f: () => B): Run<B> {
    return new Run(f);
  }

  public static of<B>(b: B): Run<B> {
    return new Run(() => b);
  }

  constructor(io: () => A) {
    // memoize
    let isMemoized = false;
    let memoizedValue: A | undefined;
    let memoizedError: Error | undefined;
    this[get] = () => {
      if (!isMemoized) {
        try {
          memoizedValue = io();
        } catch (err) {
          memoizedError = err;
        }
        isMemoized = true;
      }
      if (memoizedError) {
        throw memoizedError;
      } else {
        return memoizedValue!;
      }
    };
  }

  public map<B>(f: (a: A) => B): Run<B> {
    return this.chain(a => new Run(() => f(a)));
  }

  public chain<C2>(f: (a: A) => Run<C2>): Run<C2> {
    return new Run(() => Run.resolve(f(this[get]())));
  }

  public static concat<T extends any[]>(...runArray: T): Flatten<HList<T>> {
    let result: Run<any> | undefined;
    for (const run of (runArray as Run<any>[])) {
      if (result) {
        result = result.chain(r => run.map((t: T) => [...r, t]));
      } else {
        result = run.map((t: T) => [t]);
      }
    }
    return result || Run.of([]);
  }
}

type GetBuildType<B> = B extends Run<infer b> ? b : never;
type MapBuilds<B extends any[]> = { [K in keyof B]: GetBuildType<B[K]>; };
type Flatten<T extends any[]> = Run<MapBuilds<HList<T>>>;
