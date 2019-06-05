import iam = require('@aws-cdk/aws-iam');
import kinesis = require('@aws-cdk/aws-kinesis');
import lambda = require('@aws-cdk/aws-lambda');
import events = require('@aws-cdk/aws-lambda-event-sources');
import cdk = require('@aws-cdk/cdk');
import AWS = require('aws-sdk');
import uuid = require('uuid');

import { Function } from '../compute';
import { Clients, Dependency, Runtime } from '../compute';
import { Cons } from '../compute/hlist';
import { Cache, PropertyBag } from '../compute/property-bag';
import { BufferMapper, Json, Mapper, RuntimeType, StructType, Type } from '../shape';
import { Codec, Partition, TableProps } from '../storage';
import { Compression } from '../storage/glue/compression';
import { Collector } from './collector';
import { DependencyType, Enumerable, EnumerableRuntime, EventType } from './enumerable';
import { Resource } from './resource';
import { S3DeliveryStream } from './s3-delivery-stream';
import { sink, Sink, SinkProps } from './sink';

export type EnumerableStreamRuntime = EnumerableRuntime & events.KinesisEventSourceProps;

export interface StreamProps<T extends Type<any>> extends kinesis.StreamProps {
  /**
   * Type of data in the stream.
   */
  type: T;

  /**
   * @default - uuid
   */
  partitionBy?: (record: RuntimeType<T>) => string;
}

/**
 * A Kinesis stream.
 */
export class Stream<T extends Type<any>> implements Resource<kinesis.Stream>, Dependency<Stream.Client<T>> {
  public readonly type: T;
  public readonly mapper: Mapper<RuntimeType<T>, Buffer>;
  public readonly partitionBy: (record: RuntimeType<T>) => string;
  public readonly resource: kinesis.Stream;

  constructor(scope: cdk.Construct, id: string, props: StreamProps<T>) {
    this.type = props.type;
    this.resource = new kinesis.Stream(scope, id, props);
    this.mapper = BufferMapper.wrap(Json.forType(props.type));
    this.partitionBy = props.partitionBy || (_ => uuid());
  }

  /**
   * Create an enumerable for this stream to perform chainable computations (map, flatMap, filter, etc.)
   */
  public enumerable(): EnumerableStream<RuntimeType<T>, []> {
    return new EnumerableStream(this, this as any, {
      depends: [],
      handle: i => i
    });
  }

  /**
   * Forward data in this stream to S3 via a Delivery Stream.
   *
   * Stream -> Firehose -> S3 (minutely).
   */
  public toS3DeliveryStream(scope: cdk.Construct, id: string, props: {
    codec: Codec;
    comression: Compression;
  } = {
    codec: Codec.Json,
    comression: Compression.Gzip
  }): S3DeliveryStream<T> {
    return new S3DeliveryStream(scope, id, {
      stream: this,
      codec: props.codec,
      compression: props.comression
    });
  }

  /**
   * Forward data in this stream to S3 via a Delivery Stream, and then partition and catalog data in a Glue Table.
   *
   * Stream -> Firehose -> S3 (time-based staging) -> Lambda -> S3 (partitioned data)
   *                                                         -> Glue Table (catalog)
   */
  public toGlueTable<P extends Partition>(scope: cdk.Construct, id: string, props: TableProps<T extends StructType<infer S> ? S : never, P>) {
    scope = new cdk.Construct(scope, id);
    return this
      .toS3DeliveryStream(scope, 'ToS3').enumerable()
      .toGlueTable(scope, 'ToGlue', props);
  }

  /**
   * Return an iterator of records parsed from the raw data in the event.
   * @param event kinesis event sent to lambda
   */
  public async *run(event: KinesisEvent): AsyncIterableIterator<RuntimeType<T>> {
    for (const record of event.Records.map(record => this.mapper.read(Buffer.from(record.kinesis.data, 'base64')))) {
      yield record;
    }
  }

  /**
   * Create a client for this `Stream` from within a `Runtime` environment (e.g. a Lambda Function.).
   * @param properties runtime properties local to this `stream`.
   * @param cache global `Cache` shared by all clients.
   */
  public bootstrap(properties: PropertyBag, cache: Cache): Stream.Client<T> {
    return new Stream.Client(this,
      properties.get('streamName'),
      cache.getOrCreate('aws:kinesis', () => new AWS.Kinesis()));
  }

  /**
   * Set `streamName` and grant permissions to a `Runtime` so it may `bootstrap` a client for this `Stream`.
   * @param target runtime to install this stream into
   */
  public install(target: Runtime): void {
    this.readWriteClient().install(target);
  }

  /**
   * Read and Write access to this stream.
   */
  public readWriteClient(): Dependency<Stream.Client<T>> {
    return this._client(g => this.resource.grantReadWrite(g));
  }

  /**
   * Read-only access to this stream.
   */
  public readClient(): Dependency<Stream.Client<T>> {
    return this._client(g => this.resource.grantRead(g));
  }

  /**
   * Write-only access to this stream.
   */
  public writeClient(): Dependency<Stream.Client<T>> {
    return this._client(g => this.resource.grantWrite(g));
  }

  private _client(grant: (grantable: iam.IGrantable) => void): Dependency<Stream.Client<T>> {
    return {
      install: target => {
        target.properties.set('streamName', this.resource.streamName);
        grant(target.grantable);
      },
      bootstrap: this.bootstrap.bind(this),
    };
  }
}

/**
 * An enumerable Kinesis Stream.
 */
export class EnumerableStream<T, D extends any[]> extends Enumerable<KinesisEvent, T, D, EnumerableStreamRuntime>  {
  constructor(public readonly stream: Stream<any>, previous: EnumerableStream<any, any>, input: {
    depends: D;
    handle: (value: AsyncIterableIterator<any>, deps: Clients<D>) => AsyncIterableIterator<T>;
  }) {
    super(previous, input.handle, input.depends);
  }

  /**
   * Create a `KinesisEventSource` which attaches a Lambda Function to this Stream.
   * @param props optional tuning properties for the event source.
   */
  public eventSource(props?: EnumerableStreamRuntime) {
    return new events.KinesisEventSource(this.stream.resource, props || {
      batchSize: 100,
      startingPosition: lambda.StartingPosition.TrimHorizon
    });
  }

  /**
   * Chain a computation and dependency pair with this computation.
   * @param input the next computation along with its dependencies.
   */
  public chain<U, D2 extends any[]>(input: {
    depends: D2;
    handle: (value: AsyncIterableIterator<T>, deps: Clients<D2>) => AsyncIterableIterator<U>;
  }): EnumerableStream<U, D2> {
    return new EnumerableStream<U, D2>(this.stream, this, input);
  }
}

export namespace Stream {
  export type PutRecordInput<T> = {Data: T} & Pick<AWS.Kinesis.PutRecordInput, 'ExplicitHashKey' | 'SequenceNumberForOrdering'>;
  export type PutRecordOutput = AWS.Kinesis.PutRecordOutput;
  export type PutRecordsInput<T> = Array<{Data: T} & Pick<AWS.Kinesis.PutRecordsRequestEntry, 'ExplicitHashKey'>>;
  export type PutRecordsOutput = AWS.Kinesis.PutRecordsOutput;

  /**
   * A client to a specific Kinesis Stream of some type, `T`.
   *
   * @typeparam T type of data in the stream.
   * @see https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html
   */
  export class Client<T extends Type<any>> implements Sink<RuntimeType<T>> {
    constructor(
      public readonly stream: Stream<T>,
      public readonly streamName: string,
      public readonly client: AWS.Kinesis
    ) {}

    /**
     * Put a single record to the Stream.
     * @param input Data and optional ExplicitHashKey and SequenceNumberForOrdering
     */
    public putRecord(input: PutRecordInput<RuntimeType<T>>): Promise<PutRecordOutput> {
      return this.client.putRecord({
        ...input,
        StreamName: this.streamName,
        Data: this.stream.mapper.write(input.Data),
        PartitionKey: this.stream.partitionBy(input.Data),
      }).promise();
    }

    /**
     * Put a batch of records to the stream.
     *
     * Note: a successful (no exception) does not ensure that all records were successfully put to the
     * stream; you must check the error code of each record in the response and re-drive those which failed.
     *
     * Maxiumum number of records: 500.
     * Maximum payload size: 1MB (base64-encoded).
     *
     * @param request array of records containing Data and optional ExplicitHashKey and SequenceNumberForOrdering
     * @returns output containing sequence numbers of successful records and error codes of failed records.
     * @see https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html
     */
    public putRecords(request: PutRecordsInput<RuntimeType<T>>): Promise<PutRecordsOutput> {
      return this.client.putRecords({
        StreamName: this.streamName,
        Records: request.map(record => ({
          ...record,
          Data: this.stream.mapper.write(record.Data),
          PartitionKey: this.stream.partitionBy(record.Data)
        }))
      }).promise();
    }

    /**
     * Put all records (ignoring request limits of Kinesis) by batching all records into
     * optimal `putRecords` calls; failed records will be redriven, and intermittent failures
     * will be handled with back-offs and retry attempts.
     *
     * @param records array of records to 'sink' to the stream.
     * @param props configure retry and ordering behavior
     */
    public async sink(records: Array<RuntimeType<T>>, props?: SinkProps): Promise<void> {
      await sink(records, async values => {
        const result = await this.putRecords(values.map(value => ({
          Data: value
        })));

        if (result.FailedRecordCount) {
          return result.Records.map((r, i) => {
            if (r.SequenceNumber) {
              return [i];
            } else {
              return [];
            }
          }).reduce((a, b) => a.concat(b)).map(i => values[i]);
        }
        return [];
      }, props, 500);
    }
  }
}

/**
 * Payload sent to Lambda Function subscribed to a Kinesis Stream.
 *
 * @see https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
 */
export interface KinesisEvent {
  Records: Array<{
    kinesis: {
      kinesisSchemaVersion: string;
      partitionKey: string;
      sequenceNumber: string;
      data: string;
      approximateArrivalTimestamp: number;
    };
    eventSource: string;
    eventVersion: string;
    eventID: string;
    eventName: string;
    invokeIdentityArn: string;
    awsRegion: string;
    eventSourceARN: string;
  }>;
}

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
declare module './enumerable' {
  interface Enumerable<E, I, D extends any[], R extends EnumerableRuntime> {
    /**
     * Collect data to a Kinesis Stream.
     *
     * @param scope
     * @param id
     * @param streamProps properties of the created stream
     * @param runtimeProps optional runtime properties to configure the function processing the enumerable's data.
     * @typeparam T concrete type of data flowing to stream
     */
    toStream<T extends Type<I>>(scope: cdk.Construct, id: string, streamProps: StreamProps<T>, runtimeProps?: R): CollectedStream<T, this>;
  }
}
Enumerable.prototype.toStream = function(scope: cdk.Construct, id: string, props: StreamProps<any>): any {
  return this.collect(scope, id, new StreamCollector(props));
};
