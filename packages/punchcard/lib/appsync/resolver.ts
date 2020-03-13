import { Shape } from '@punchcard/shape';
import { Function } from '../lambda/function';
import { GraphQL } from './types';

const resolver = Symbol.for('punchcard/lib/appsync.Resolver');

export class Resolver<T extends GraphQL.RecordClass = any> {
  public static isResolver(a: any): a is Resolver {
    return a[resolver] !== undefined;
  }

  public static getRecordClass<T extends GraphQL.RecordClass>(_resolver: Resolver<T>): T {
    return _resolver[resolver];
  }

  public readonly [resolver]: T;

  constructor(_resolver: T) {
    this[resolver] = _resolver;
  }
}
export namespace Resolver {
  export type GetClass<T extends Resolver> = T extends Resolver<infer C> ? C : never;
  export type GetType<T extends Resolver> = T extends Resolver<infer C> ? InstanceType<C> : never;
}

export function invoke<T extends Shape, U extends Shape>(fn: Function<T, U, any>, input: GraphQL.TypeOf<T>): GraphQL<GraphQL.TypeOf<U>> {
  return null as any;
}
