import {HList} from "../util/hlist";
import {IO} from "fp-ts/lib/IO";
import {Monad1} from "fp-ts/lib/Monad";

const URI = "Run";
type URI = typeof URI;

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> {
    Run: Run<A>;
  }
}

export const RUN: Monad1<URI> = {
  URI,
  ap: (fab, fa) => RUN.chain(fab, (ab) => fa.map(ab)),
  chain: (fa, f) => new Run(() => f(fa[get]())[get]()),
  map: (fa, f) => RUN.chain(fa, (a) => new Run(() => f(a))),
  of: (a) => new Run(() => a),
};

const get = Symbol.for("Runtime.get");

/**
 * The Runtime Universe.
 */
export class Run<A> {
  public static resolve<T>(r: Run<T>): T {
    return r[get]();
  }
  public static lazy<B>(f: IO<B>): Run<B> {
    return RUN.of(f).map((_) => _());
  }
  public static of<B>(b: B): Run<B> {
    return RUN.of(b);
  }
  public static concat<T extends any[]>(...runArray: T): Flatten<HList<T>> {
    let result: Run<any> | undefined;
    for (const run of runArray as Run<any>[]) {
      if (result) {
        result = result.chain((r) => run.map((t: T) => [...r, t]));
      } else {
        result = run.map((t: T) => [t]);
      }
    }
    return result || Run.of([]);
  }
  public readonly [get]: IO<A>;

  constructor(_next: IO<A>) {
    // memoize
    let isMemoized = false;
    let value: A | undefined;
    this[get] = (): A => {
      if (!isMemoized) {
        value = _next();
        isMemoized = true;
      }
      return value!;
    };
  }

  public ap<B>(fab: Run<(a: A) => B>, fa: Run<A>): Run<B> {
    return RUN.ap(fab, fa);
  }

  public map<B>(f: (a: A) => B): Run<B> {
    return RUN.map(this, f);
  }

  public chain<C2>(f: (a: A) => Run<C2>): Run<C2> {
    return RUN.chain(this, f);
  }
}

type GetBuildType<B> = B extends Run<infer b> ? b : never;
type MapBuilds<B extends any[]> = {[K in keyof B]: GetBuildType<B[K]>};
type Flatten<T extends any[]> = Run<MapBuilds<HList<T>>>;
