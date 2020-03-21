import * as cdk from "@aws-cdk/core";
import {DependencyType, EventType, Stream as SStream} from "../util/stream";
import {NothingShape, Shape, Value} from "@punchcard/shape";
import {Stream, StreamProps} from "./stream";
import {Build} from "../core/build";
import {Client} from "./client";
import {Collector} from "../util/collector";
import {Cons} from "../util/hlist";
import {Dependency} from "../core/dependency";
import {Function} from "../lambda/function";

/**
 * Add a utility method `toStream` for `Stream` which uses the `StreamCollector` to produce Kinesis `Streams`.
 */
declare module "../util/stream" {
  interface Stream<E, T, D extends any[], C> {
    /**
     * Collect data to a Kinesis Stream.
     *
     * @param scope - todo: add description
     * @param id - todo: add description
     * @param streamProps - properties of the created stream
     * @param runtimeProps - optional runtime properties to configure the function processing the stream's data.
     * @typeparam T - concrete type of data flowing to stream
     */
    toKinesisStream<DataType extends Shape>(
      scope: Build<cdk.Construct>,
      id: string,
      streamProps: StreamProps<Value.Of<DataType> extends T ? DataType : never>,
      runtimeProps?: C,
    ): CollectedStream<DataType, this>;
  }
}
SStream.prototype.toKinesisStream = function(
  scope: Build<cdk.Construct>,
  id: string,
  props: StreamProps<any>,
): any {
  return this.collect(scope, id, new StreamCollector(props));
};

/**
 * Creates a new Kineis stream and sends data from an stream to it.
 */
export class StreamCollector<
  T extends Shape,
  S extends SStream<any, Value.Of<T>, any, any>
> implements Collector<CollectedStream<T, S>, S> {
  constructor(private readonly props: StreamProps<T>) {}

  public collect(
    scope: Build<cdk.Construct>,
    id: string,
    stream: S,
  ): CollectedStream<T, S> {
    return new CollectedStream(scope, id, {
      ...this.props,
      stream,
    });
  }
}

/**
 * Properties for creating a collected stream.
 */
export interface CollectedStreamProps<
  T extends Shape,
  S extends SStream<any, Value.Of<T>, any, any>
> extends StreamProps<T> {
  /**
   * Source of the data; an stream.
   */
  readonly stream: S;
}
/**
 * A Kinesis `Stream` produced by collecting data from an `Stream`.
 */
export class CollectedStream<
  T extends Shape,
  S extends SStream<any, any, any, any>
> extends Stream<T> {
  public readonly sender: Function<
    EventType<S>,
    NothingShape,
    Dependency.Concat<Cons<DependencyType<S>, Dependency<Client<T>>>>
  >;

  constructor(
    scope: Build<cdk.Construct>,
    id: string,
    props: CollectedStreamProps<T, S>,
  ) {
    super(scope, id, props);
    this.sender = props.stream.forBatch(
      this.resource,
      "ToStream",
      {
        depends: this.writeAccess(),
      },
      (events, self) => self.sink(events),
    ) as any;
  }
}
