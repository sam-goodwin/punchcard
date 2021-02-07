import { Shape } from '@punchcard/shape';

export type Subscriptions<T extends Shape> = Subscribe<T>[] | Subscribe<T>;

const tag = Symbol.for('appsync.Subscribe');

export class Subscribe<T extends Shape> {
  public readonly [tag]: true = true;

  public static readonly TAG = tag;

  public static isSubscription(a: any): a is Subscribe<Shape> {
    return a[tag] === true;
  }

  constructor(
    public readonly field: string,
    public readonly type: T
  ) {
  }
}