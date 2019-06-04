import iam = require('@aws-cdk/aws-iam');
import kinesis = require('@aws-cdk/aws-kinesis');
import { StartingPosition } from '@aws-cdk/aws-lambda';
import events = require('@aws-cdk/aws-lambda-event-sources');
import cdk = require('@aws-cdk/cdk');
import AWS = require('aws-sdk');
import uuid = require('uuid');
import { Clients, Dependency, Runtime } from '../compute';
import { Cache, PropertyBag } from '../compute/property-bag';
import { BufferMapper, Json, Mapper, RuntimeType, StructType, Type } from '../shape';
import { Codec, Partition, TableProps } from '../storage';
import { Compression } from '../storage/glue/compression';
import { Omit } from '../utils';
import { Enumerable, EnumerableRuntime } from './enumerable';
import { Resource } from './resource';
import { S3DeliveryStream } from './s3';
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

  public stream(): EnumerableStream<RuntimeType<T>, []> {
    return new EnumerableStream(this, this as any, {
      depends: [],
      handle: i => i
    });
  }

  public toS3(scope: cdk.Construct, id: string, props: {
    codec: Codec;
    comression: Compression;
  } = {
    codec: Codec.Json,
    comression: Compression.Gzip
  }): S3DeliveryStream<RuntimeType<T>> {
    return new S3DeliveryStream(scope, id, {
      stream: this as any,
      codec: props.codec,
      compression: props.comression
    });
  }

  public toGlue<P extends Partition>(scope: cdk.Construct, id: string, props: TableProps<T extends StructType<infer S> ? S : never, P>) {
    scope = new cdk.Construct(scope, id);
    return this
      .toS3(scope, 'ToS3').stream()
      .toGlue(scope, 'ToGlue', props);
  }

  public async *run(event: KinesisEvent): AsyncIterableIterator<RuntimeType<T>> {
    for (const record of event.Records.map(record => this.mapper.read(Buffer.from(record.kinesis.data, 'base64')))) {
      yield record;
    }
  }

  public bootstrap(properties: PropertyBag, cache: Cache): Stream.Client<T> {
    return new Stream.Client(this,
      properties.get('streamName'),
      cache.getOrCreate('aws:kinesis', () => new AWS.Kinesis()));
  }

  public install(target: Runtime): void {
    this.readWriteClient().install(target);
  }

  public readWriteClient(): Dependency<Stream.Client<T>> {
    return this._client(g => this.resource.grantReadWrite(g));
  }

  public readClient(): Dependency<Stream.Client<T>> {
    return this._client(g => this.resource.grantRead(g));
  }

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

export class EnumerableStream<T, D extends any[]> extends Enumerable<KinesisEvent, T, D, EnumerableStreamRuntime>  {
  constructor(public readonly stream: Stream<any>, previous: EnumerableStream<any, any>, input: {
    depends: D;
    handle: (value: AsyncIterableIterator<any>, deps: Clients<D>) => AsyncIterableIterator<T>;
  }) {
    super(previous, input.handle, input.depends);
  }

  public eventSource(props?: EnumerableStreamRuntime) {
    return new events.KinesisEventSource(this.stream.resource, props || {
      batchSize: 100,
      startingPosition: StartingPosition.TrimHorizon
    });
  }

  public chain<U, D2 extends any[]>(input: {
    depends: D2;
    handle: (value: AsyncIterableIterator<T>, deps: Clients<D2>) => AsyncIterableIterator<U>;
  }): EnumerableStream<U, D2> {
    return new EnumerableStream<U, D2>(this.stream, this, input);
  }
}

export namespace Stream {
  export type PutRecordInput<T> = {Data: T} & Omit<AWS.Kinesis.PutRecordInput, 'Data' | 'StreamName'>;
  export type PutRecordOutput = AWS.Kinesis.PutRecordOutput;
  export type PutRecordsInput<T> = Array<{Data: T} & Omit<AWS.Kinesis.PutRecordsRequestEntry, 'Data'>>;
  export type PutRecordsOutput = AWS.Kinesis.PutRecordsOutput;

  export class Client<T extends Type<any>> implements Sink<RuntimeType<T>> {
    constructor(
      public readonly stream: Stream<T>,
      public readonly streamName: string,
      public readonly client: AWS.Kinesis
    ) {}

    public putRecord(request: PutRecordInput<RuntimeType<T>>): Promise<PutRecordOutput> {
      return this.client.putRecord({
        ...request,
        StreamName: this.streamName,
        Data: this.stream.mapper.write(request.Data)
      }).promise();
    }

    public putRecords(request: PutRecordsInput<RuntimeType<T>>): Promise<PutRecordsOutput> {
      return this.client.putRecords({
        StreamName: this.streamName,
        Records: request.map(record => ({
          ...record,
          Data: this.stream.mapper.write(record.Data)
        }))
      }).promise();
    }

    public async sink(records: Array<RuntimeType<T>>, props?: SinkProps): Promise<void> {
      await sink(records, async values => {
        const result = await this.putRecords(values.map(value => ({
          Data: value,
          PartitionKey: this.stream.partitionBy(value)
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
