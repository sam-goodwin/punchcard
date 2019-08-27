import iam = require('@aws-cdk/aws-iam');
import kinesis = require('@aws-cdk/aws-kinesis');
import lambda = require('@aws-cdk/aws-lambda');
import events = require('@aws-cdk/aws-lambda-event-sources');
import core = require('@aws-cdk/core');
import AWS = require('aws-sdk');
import uuid = require('uuid');

import { Namespace } from '../core/assembly';
import { Cache } from '../core/cache';
import { Clients } from '../core/client';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { DeliveryStream } from '../firehose/delivery-stream';
import { BufferMapper, Json, Mapper, RuntimeType, Type } from '../shape';
import { Codec } from '../util/codec';
import { Compression } from '../util/compression';
import { sink, Sink, SinkProps } from '../util/sink';
import { Stream as SStream } from '../util/stream';
import { Event } from './event';

export type Config = SStream.Config & events.KinesisEventSourceProps;

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

  constructor(scope: core.Construct, id: string, props: StreamProps<T>) {
    this.type = props.type;
    this.resource = new kinesis.Stream(scope, id, props);
    this.mapper = BufferMapper.wrap(Json.forType(props.type));
    this.partitionBy = props.partitionBy || (_ => uuid());
  }

  /**
   * Create an stream for this stream to perform chainable computations (map, flatMap, filter, etc.)
   */
  public stream(): StreamStream<RuntimeType<T>, []> {
    const mapper = this.mapper;
    class Root extends StreamStream<RuntimeType<T>, []> {
      /**
       * Return an iterator of records parsed from the raw data in the event.
       * @param event kinesis event sent to lambda
       */
      public async *run(event: Event) {
        for (const record of event.Records.map(record => mapper.read(Buffer.from(record.kinesis.data, 'base64')))) {
          yield record;
        }
      }
    }
    return new Root(this, undefined as any, {
      depends: [],
      handle: i => i
    });
  }

  /**
   * Forward data in this stream to S3 via a Firehose Delivery Stream.
   *
   * Stream -> Firehose -> S3 (minutely).
   */
  public toFirehoseDeliveryStream(scope: core.Construct, id: string, props: {
    codec: Codec;
    compression: Compression;
  } = {
    codec: Codec.Json,
    compression: Compression.Gzip
  }): DeliveryStream<T> {
    return new DeliveryStream(scope, id, {
      stream: this,
      codec: props.codec,
      compression: props.compression
    });
  }

  /**
   * Create a client for this `Stream` from within a `Runtime` environment (e.g. a Lambda Function.).
   * @param namespace runtime properties local to this `stream`.
   * @param cache global `Cache` shared by all clients.
   */
  public async bootstrap(namespace: Namespace, cache: Cache): Promise<Stream.Client<T>> {
    return new Stream.Client(this,
      namespace.get('streamName'),
      cache.getOrCreate('aws:kinesis', () => new AWS.Kinesis()));
  }

  /**
   * Set `streamName` and grant permissions to a `Runtime` so it may `bootstrap` a client for this `Stream`.
   */
  public install(namespace: Namespace, grantable: iam.IGrantable): void {
    this.readWriteAccess().install(namespace, grantable);
  }

  /**
   * Read and Write access to this stream.
   */
  public readWriteAccess(): Dependency<Stream.Client<T>> {
    return this._client(g => this.resource.grantReadWrite(g));
  }

  /**
   * Read-only access to this stream.
   */
  public readAccess(): Dependency<Stream.Client<T>> {
    return this._client(g => this.resource.grantRead(g));
  }

  /**
   * Write-only access to this stream.
   */
  public writeAccess(): Dependency<Stream.Client<T>> {
    return this._client(g => this.resource.grantWrite(g));
  }

  private _client(grant: (grantable: iam.IGrantable) => void): Dependency<Stream.Client<T>> {
    return {
      install: (namespace, grantable) => {
        namespace.set('streamName', this.resource.streamName);
        grant(grantable);
      },
      bootstrap: this.bootstrap.bind(this),
    };
  }
}

/**
 * An stream Kinesis Stream.
 */
export class StreamStream<T, D extends any[]> extends SStream<Event, T, D, Config>  {
  constructor(public readonly stream: Stream<any>, previous: StreamStream<any, any>, input: {
    depends: D;
    handle: (value: AsyncIterableIterator<any>, deps: Clients<D>) => AsyncIterableIterator<T>;
  }) {
    super(previous, input.handle, input.depends);
  }

  /**
   * Create a `KinesisEventSource` which attaches a Lambda Function to this Stream.
   * @param props optional tuning properties for the event source.
   */
  public eventSource(props?: Config) {
    return new events.KinesisEventSource(this.stream.resource, props || {
      batchSize: 100,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON
    });
  }

  /**
   * Chain a computation and dependency pair with this computation.
   * @param input the next computation along with its dependencies.
   */
  public chain<U, D2 extends any[]>(input: {
    depends: D2;
    handle: (value: AsyncIterableIterator<T>, deps: Clients<D2>) => AsyncIterableIterator<U>;
  }): StreamStream<U, D2> {
    return new StreamStream<U, D2>(this.stream, this, input);
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
     *
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
     * Note: a successful response (no exception) does not ensure that all records were successfully put to the
     * stream; you must check the error code of each record in the response and re-drive those which failed.
     *
     * Maxiumum number of records: 500.
     * Maximum payload size: 1MB (base64-encoded).
     *
     * @param request array of records containing Data and optional `ExplicitHashKey` and `SequenceNumberForOrdering`.
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
     * Put all records (accounting for request limits of Kinesis) by batching all records into
     * optimal `putRecords` calls; failed records will be redriven, and intermittent failures
     * will be handled with back-offs and retry attempts.
     *
     * TODO: account for total payload size of 1MB base64-encoded.
     *
     * @param records array of records to 'sink' to the stream.
     * @param props configure retry and ordering behavior
     */
    public async sink(records: Array<RuntimeType<T>>, props?: SinkProps): Promise<void> {
      await sink(records, async values => {
        const result = await this.putRecords(values.map(value => ({
          Data: value
        })));

        const redrive: Array<RuntimeType<T>> = [];
        if (result.FailedRecordCount) {
          result.Records.forEach((r, i) => {
            if (!r.SequenceNumber) {
              redrive.push(values[i]);
            }
          });
        }
        return redrive;
      }, props, 500);
    }
  }
}
