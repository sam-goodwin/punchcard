import { HList } from '../util';

const get = Symbol.for('Build.get');

const Global = global as any;
const buildNodes = Symbol.for('Build.nodes');

/**
 * Store all Build nodes in a global array for easy resolution.
 *
 * @param node
 */
function add(node: Build<any>) {
  if (Global[buildNodes] === undefined) {
    Global[buildNodes] = [];
  }
  Global[buildNodes].push(node);
}

function all() {
  return Global[buildNodes] || [];
}

/**
 * The Build-Time Universe. An AST defining Build-Time Infrastructure "Constructs".
 */
export class Build<A> {
  public static walkAll() {
    for (const b of all()) {
      Build.resolve(b);
    }
  }

  public static isBuild(a: any): a is Build<any> {
    return a && a[get] !== undefined;
  }

  public static of<A>(a: A): Build<A> {
    return new Build(() => a);
  }

  public static lazy<A>(a: () => A): Build<A> {
    return new Build(a);
  }

  public static readonly empty = Build.of({});

  public static resolve<B>(a: Build<B>): B {
    return a[get]();
  }

  private readonly [get]: () => A;

  constructor(public readonly io: () => A) {
    // add this Build instance to the global state
    add(this);

    // memoize
    let isMemoized = false;
    let memoizedValue: A | undefined;
    let memoizedError: Error | undefined;
    this[get] = () => {
      if (process.env.is_runtime === 'true') {
        throw new Error('attempted to resolve a Build value at runtime');
      }
      if (!isMemoized) {
        try {
          memoizedValue = io();
        } catch (err) {
          // we should also memoize the error if it throws one to avoid confusing errors
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

  public map<B>(f: (a: A) => B): Build<B> {
    return new Build(() => f(this[get]()));
  }

  public chain<C2>(f: (a: A) => Build<C2>): Build<C2> {
    return new Build(() =>  Build.resolve(f(this[get]())));
  }

  public static concat<T extends any[]>(...buildArray: T): Flatten<HList<T>> {
    let result: Build<any[]> | undefined;
    for (const build of (buildArray as Build<any>[])) {
      if (result) {
        result = result.chain(r => build.map((t: T) => [...r, t]));
      } else {
        result = build.map((t: T) => [t]);
      }
    }
    return result || Build.of([]) as any;
  }
}

type GetBuildType<B> = B extends Build<infer b> ? b : never;
type MapBuilds<B extends any[]> = { [K in keyof B]: GetBuildType<B[K]>; };
type Flatten<T extends any[]> = Build<MapBuilds<HList<T>>>;