import cdk = require('@aws-cdk/cdk');

import { Dependency } from '../compute/dependency';
import { Cons } from '../compute/hlist';
import { Function } from '../compute/lambda';
import { DependencyType, Enumerable, EventType } from '../enumerable/enumerable';
import { Stream, StreamProps } from '../enumerable/stream';
import { RuntimeType } from '../shape/shape';
import { Type } from '../shape/types/type';
import { Collector } from './collector';

export class StreamCollector<T extends Type<any>, E extends Enumerable<any, RuntimeType<T>, any, any>>
    implements Collector<CollectedStream<T, E>, E> {
  constructor(private readonly props: StreamProps<T>) { }

  public collect(scope: cdk.Construct, id: string, enumerable: E): CollectedStream<T, E> {
    return new CollectedStream(scope, id, {
      ...this.props,
      enumerable
    });
  }
}

export interface CollectedStreamProps<T extends Type<any>, E extends Enumerable<any, RuntimeType<T>, any, any>> extends StreamProps<T> {
  readonly enumerable: E;
}
export class CollectedStream<T extends Type<any>, E extends Enumerable<any, any, any, any>> extends Stream<T> {
  public readonly sender: Function<EventType<E>, void, Dependency.List<Cons<DependencyType<E>, Dependency<Stream.Client<T>>>>>;

  constructor(scope: cdk.Construct, id: string, props: CollectedStreamProps<T, E>) {
    super(scope, id, props);
    this.sender = props.enumerable.forBatch(this.resource, 'ToStream', {
      depends: this.writeClient(),
      handle: async (events, self) => {
        self.sink(events);
      }
    }) as any;
  }
}

declare module '../enumerable/enumerable' {
  interface Enumerable<E, I, D extends any[], R extends EnumerableRuntime> {
    toStream<T extends Type<I>>(scope: cdk.Construct, id: string, streamProps: StreamProps<T>, props?: R): CollectedStream<T, this>;
  }
}
Enumerable.prototype.toStream = function(scope: cdk.Construct, id: string, props: StreamProps<any>): any {
  return this.collect(scope, id, new StreamCollector(props));
};
