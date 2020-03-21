import {HList} from "../util";
import {IO} from "fp-ts/lib/IO";
import {Monad1} from "fp-ts/lib/Monad";

const URI = "Build";
type URI = typeof URI;

declare module "fp-ts/lib/HKT" {
  interface URItoKind<A> {
    Build: Build<A>;
  }
}

export const BUILD: Monad1<URI> = {
  URI,
  ap: (fab, fa) => BUILD.chain(fab, (ab) => fa.map(ab)),
  chain: (fa, f) => new Build(() => Build.resolve(f(Build.resolve(fa)))),
  map: (fa, f) => new Build(() => f(Build.resolve(fa))),
  of: (a) => new Build(() => a),
};

const get = Symbol.for("Build.get");

const Global = global as any;
const buildNodes = Symbol.for("Build.nodes");

/**
 * Store all Build nodes in a global array for easy resolution.
 *
 * @param node - todo: add description
 */
function add(node: Build<any>): void {
  // eslint-disable-next-line security/detect-object-injection
  if (Global[buildNodes] === undefined) {
    // eslint-disable-next-line security/detect-object-injection
    Global[buildNodes] = [];
  }
  // eslint-disable-next-line security/detect-object-injection
  Global[buildNodes].push(node);
}

// todo: fix implicit return type of `any`
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function all() {
  // eslint-disable-next-line security/detect-object-injection
  return Global[buildNodes] || [];
}

/**
 * The Build-Time Universe. An AST defining Build-Time Infrastructure "Constructs".
 */
export class Build<A> {
  public static readonly empty = Build.of({});
  public static walkAll(): void {
    for (const b of all()) {
      Build.resolve(b);
    }
  }

  public static isBuild(a: any): a is Build<any> {
    // eslint-disable-next-line security/detect-object-injection
    return a && a[get] !== undefined;
  }

  public static of<A>(a: A): Build<A> {
    return BUILD.of(a);
  }

  public static lazy<A>(a: IO<A>): Build<A> {
    return new Build(a);
  }

  public static resolve<B>(a: Build<B>): B {
    // eslint-disable-next-line security/detect-object-injection
    return a[get]();
  }

  public static concat<T extends any[]>(...buildArray: T): Flatten<HList<T>> {
    let result: Build<any[]> | undefined;
    for (const build of buildArray as Build<any>[]) {
      if (result) {
        result = result.chain((r) => build.map((t: T) => [...r, t]));
      } else {
        result = build.map((t: T) => [t]);
      }
    }
    return result || (Build.of([]) as any);
  }
  public readonly [get]: IO<A>;

  constructor(public readonly io: IO<A>) {
    // add this Build instance to the global state
    add(this);

    // memoize
    let isMemoized = false;
    let value: A | undefined;
    let i = 0;
    // eslint-disable-next-line security/detect-object-injection
    this[get] = (): A => {
      if (process.env.is_runtime === "true") {
        const err = "attempted to resolve a Build value at runtime";
        console.error(err);
        throw new Error(err);
      }
      if (!isMemoized) {
        i += 1;
        if (i > 1) {
          throw new Error("broke");
        }
        value = io();
        isMemoized = true;
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return value!;
    };
  }

  public ap<B>(fab: Build<(a: A) => B>, fa: Build<A>): Build<B> {
    return BUILD.ap(fab, fa);
  }

  public map<B>(f: (a: A) => B): Build<B> {
    return BUILD.map(this, f);
  }

  public chain<C2>(f: (a: A) => Build<C2>): Build<C2> {
    return BUILD.chain(this, f);
  }
}

type GetBuildType<B> = B extends Build<infer b> ? b : never;
type MapBuilds<B extends any[]> = {[K in keyof B]: GetBuildType<B[K]>};
type Flatten<T extends any[]> = Build<MapBuilds<HList<T>>>;
