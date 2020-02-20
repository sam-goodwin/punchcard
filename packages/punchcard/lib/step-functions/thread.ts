import { Scope } from "./scope";

export const IsThread = Symbol.for('punchcard.Thread');

export function isThread(a: any): a is Thread {
  return a !== undefined && a[IsThread] === true;
}

export class Thread extends Scope {
  public readonly [IsThread]: true = true;

  public static currentThread(): Thread | undefined {
    const glob = global as any;
    if (isThread(glob[IsThread])) {
      return glob[IsThread];
    }
    return undefined;
  }

  public static run<T>(fn: (resolve: (value: T) => void, reject: () => void, thread: Thread) => void): T {
    const ct = Thread.currentThread();
    if (ct === undefined) {
      const glob = global as any;
      glob[IsThread] = new Thread();
    }
    throw new Error(`a parallel thread is already running`);
  }

  constructor() {
    super();
  }

  public get thread() {
    return this;
  }
}
