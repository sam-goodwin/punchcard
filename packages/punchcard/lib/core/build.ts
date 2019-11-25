import { Monad1 } from 'fp-ts/lib/Monad';

import { IO } from 'fp-ts/lib/IO';
import { HList } from '../util';

const URI = 'Build';
type URI = typeof URI;

declare module 'fp-ts/lib/HKT' {
  interface URItoKind<A> {
    Build: Build<A>
  }
}

export const BUILD: Monad1<URI> = {
  URI,
  ap: (fab, fa) => BUILD.chain(fab, ab => fa.map(ab)),
  chain: (fa, f) => new Build(() => f(fa[get]())[get](), fa),
  map: (fa, f) => BUILD.chain(fa, a => new Build(() => f(a), fa)), //  new AWS(() => f(fa[next]()), fa),
  of: (a) => new Build(() => a),
};

const get = Symbol.for('Build.get');

const children = Symbol.for('Build.children');

/**
 * The Build-Time Universe. An AST defining Build-Time Infrastructure "Constructs".
 */
export class Build<A> {
  public static walk(b: Build<any>): void {
    const wm = new WeakSet();

    walk(b);

    function walk(b: Build<any>): void {
      if (wm.has(b)) {
        return;
      }
      wm.add(b);
      if (b[children]) {
        for (const child of b[children]) {
          Build.walk(child);
        }
      }
      const resolved = Build.resolve(b);
      if (Build.isBuild(resolved)) {
        Build.walk(resolved);
      }
    }
  }

  public static isBuild(a: any): a is Build<any> {
    return a && a[get] !== undefined;
  }

  public static of<A>(a: A): Build<A> {
    return BUILD.of(a);
  }

  public static lazy<A>(a: IO<A>): Build<A> {
    return BUILD.of(a).map(_ => _());
  }

  public static resolve<B>(a: Build<B>): B {
    return a[get]();
  }

  public static children(a: Build<any>): Array<Build<any>> {
    return a[children];
  }

  public readonly [get]: IO<A>;

  public readonly [children]: Array<Build<A>> = [];

  constructor(_get: IO<A>, public readonly parent?: Build<any>) {
    if (parent) {
      parent[children].push(this);
    }
    // memoize
    let isMemoized = false;
    let value: A | undefined;
    this[get] = () => {
      if (process.env.is_runtime === 'true') {
        const err = 'attempted to resolve a Build value at runtime';
        console.error(err);
        throw new Error(err);
      }
      if (!isMemoized) {
        value = _get();
        isMemoized = true;
      }
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

  public static concat<T extends any[]>(...buildArray: T): Flatten<HList<T>> {
    let result: Build<any[]> | undefined;
    for (const build of (buildArray as Array<Build<any>>)) {
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