import cdk = require('@aws-cdk/cdk');

import { Dependency } from '../../compute/dependency';
import { Cons } from '../../compute/hlist';
import { Function } from '../../compute/lambda';
import { RuntimeType } from '../../shape/shape';
import { Type } from '../../shape/types/type';
import { DependencyType, Enumerable, EventType } from '../enumerable';
import { Stream, StreamProps } from '../stream';
import { Collector } from './collector';

/**
 * Creates a new Kineis stream and sends data from an enumerable to it.
 */
export class StreamCollector<T extends Type<any>, E extends Enumerable<any, RuntimeType<T>, any, any>> implements Collector<CollectedStream<T, E>, E> {
  constructor(private readonly props: StreamProps<T>) { }

  public collect(scope: cdk.Construct, id: string, enumerable: E): CollectedStream<T, E> {
    return new CollectedStream(scope, id, {
      ...this.props,
      enumerable
    });
  }
}

/**
 * Properties for creating a collected stream.
 */
export interface CollectedStreamProps<T extends Type<any>, E extends Enumerable<any, RuntimeType<T>, any, any>> extends StreamProps<T> {
  /**
   * Source of the data; an enumerable.
   */
  readonly enumerable: E;
}
/**
 * A Kinesis `Stream` produced by collecting data from an `Enumerable`.
 * @typeparam
 */
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

/**
 * Add a utility method `toStream` for `Enumerable` which uses the `StreamCollector` to produce Kinesis `Streams`.
 */
declare module '../enumerable' {
  interface Enumerable<E, I, D extends any[], R extends EnumerableRuntime> {
    /**
     * Collect data to a Kinesis Stream.
     *
     * @param scope
     * @param id
     * @param streamProps properties of the created stream
     * @param props optional runtime properties to configure the function consuming from Kinesis
     * @typeparam T concrete type of data flowing to stream
     */
    toStream<T extends Type<I>>(scope: cdk.Construct, id: string, streamProps: StreamProps<T>, props?: R): CollectedStream<T, this>;
  }
}
Enumerable.prototype.toStream = function(scope: cdk.Construct, id: string, props: StreamProps<any>): any {
  return this.collect(scope, id, new StreamCollector(props));
};
