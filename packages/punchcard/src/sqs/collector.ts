import { AnyShape, Shape, Value } from '@punchcard/shape';
import { Build } from '../core/build';
import { Dependency } from '../core/dependency';
import { Function } from '../lambda/function';
import { Collector } from '../util/collector';
import { Cons } from '../util/hlist';
import { DependencyType, EventType, Stream } from '../util/stream';
import { Queue, QueueProps } from './queue';

import type * as cdk from '@aws-cdk/core';

/**
 * Add a utility method `toQueue` for `Stream` which uses the `QueueCollector` to produce SQS `Queues`.
 */
declare module '../util/stream' {
  interface Stream<E, T, D extends any[], C> {
    /**
     * Collect data to a SQS Queue (as messages).
     *
     * @param scope
     * @param id
     * @param queueProps properties of the created queue
     * @param runtimeProps optional runtime properties to configure the function processing the stream's data.
     * @typeparam T concrete type of data flowing to queue
     */
    toSQSQueue<DataType extends Shape & { [Value.Tag]: T; }>(scope: Build<cdk.Construct>, id: string, queueProps: QueueProps<DataType>, runtimeProps?: C): Queue<DataType>;
  }
}
Stream.prototype.toSQSQueue = function(scope: Build<cdk.Construct>, id: string, props: QueueProps<any>): any {
  return this.collect(scope, id, new QueueCollector(props));
};

/**
 * Creates a new SQS `Queue` and sends data from a `Stream` to it (as messages).
 *
 * @typeparam T type of messages in the SQS Queue.
 */
export class QueueCollector<T extends Shape, S extends Stream<any, Value.Of<T>, any, any>> implements Collector<Queue<T>, S> {
  constructor(private readonly props: QueueProps<T>) { }

  public collect(scope: Build<cdk.Construct>, id: string, stream: S): Queue<T> {
    return new CollectedQueue(scope, id, {
      ...this.props,
      stream
    });
  }
}

/**
 * Properties for creating a collected `Queue`.
 */
export interface CollectedQueueProps<T extends Shape, S extends Stream<any, Value.Of<T>, any, any>> extends QueueProps<T> {
  /**
   * Source of the data; a `Stream`.
   */
  readonly stream: S;
}

/**
 * A SQS `Queue` produced by collecting data from an `Stream`.
 * @typeparam T type of notififcations sent to, and emitted from, the SQS Queue.
 */
export class CollectedQueue<T extends Shape, S extends Stream<any, any, any, any>> extends Queue<T> {
  public readonly sender: Function<EventType<S>, AnyShape /* TODO: VoidShape? */, Dependency.Concat<Cons<DependencyType<S>, Dependency<Queue.Client<T>>>>>;

  constructor(scope: Build<cdk.Construct>, id: string, props: CollectedQueueProps<T, S>) {
    super(scope, id, props);
    this.sender = props.stream.forBatch(this.resource, 'ToQueue', {
      depends: this.sendAccess(),
    }, (events, self) => self.sink(events)) as any;
  }
}
