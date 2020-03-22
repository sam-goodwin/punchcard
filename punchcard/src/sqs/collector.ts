import * as cdk from "@aws-cdk/core";
import {AnyShape, Shape, Value} from "@punchcard/shape";
import {DependencyType, EventType, Stream} from "../util/stream";
import {Queue, QueueProps} from "./queue";
import {Build} from "../core/build";
import {Collector} from "../util/collector";
import {Cons} from "../util/hlist";
import {Dependency} from "../core/dependency";
import {Function} from "../lambda/function";

/**
 * Add a utility method `toQueue` for `Stream` which uses the `QueueCollector` to produce SQS `Queues`.
 */
declare module "../util/stream" {
  interface Stream<E, T, D extends any[], C> {
    /**
     * Collect data to a SQS Queue (as messages).
     *
     * @param scope - todo: add description
     * @param id - todo: add description
     * @param queueProps - properties of the created queue
     * @param runtimeProps - optional runtime properties to configure the function processing the stream's data.
     * @typeparam T - concrete type of data flowing to queue
     */
    toSQSQueue<DataType extends Shape & {[Value.Tag]: T}>(
      scope: Build<cdk.Construct>,
      id: string,
      queueProps: QueueProps<DataType>,
      runtimeProps?: C,
    ): CollectedQueue<DataType, this>;
  }
}
Stream.prototype.toSQSQueue = function(
  scope: Build<cdk.Construct>,
  id: string,
  props: QueueProps<any>,
): any {
  return this.collect(scope, id, new QueueCollector(props));
};

/**
 * Creates a new SQS `Queue` and sends data from a `Stream` to it (as messages).
 *
 * @typeparam T - type of messages in the SQS Queue.
 */
export class QueueCollector<
  T extends Shape,
  S extends Stream<any, Value.Of<T>, any, any>
> implements Collector<CollectedQueue<T, S>, S> {
  constructor(private readonly props: QueueProps<T>) {}

  public collect(
    scope: Build<cdk.Construct>,
    id: string,
    stream: S,
  ): CollectedQueue<T, S> {
    return new CollectedQueue(scope, id, {
      ...this.props,
      stream,
    });
  }
}

/**
 * Properties for creating a collected `Queue`.
 */
export interface CollectedQueueProps<
  T extends Shape,
  S extends Stream<any, Value.Of<T>, any, any>
> extends QueueProps<T> {
  /**
   * Source of the data; a `Stream`.
   */
  readonly stream: S;
}

/**
 * A SQS `Queue` produced by collecting data from an `Stream`.
 * @typeparam T - type of notififcations sent to, and emitted from, the SQS Queue.
 */
export class CollectedQueue<
  T extends Shape,
  S extends Stream<any, any, any, any>
> extends Queue<T> {
  public readonly sender: Function<
    EventType<S>,
    AnyShape /* TODO: VoidShape? */,
    Dependency.Concat<Cons<DependencyType<S>, Dependency<Queue.Client<T>>>>
  >;

  constructor(
    scope: Build<cdk.Construct>,
    id: string,
    props: CollectedQueueProps<T, S>,
  ) {
    super(scope, id, props);
    this.sender = props.stream.forBatch(
      this.resource,
      "ToQueue",
      {
        depends: this.sendAccess(),
      },
      (events, self) => self.sink(events),
    ) as any;
  }
}
