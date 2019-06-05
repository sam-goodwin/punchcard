import AWS = require('aws-sdk');

import lambda = require('@aws-cdk/aws-lambda');
import events = require('@aws-cdk/aws-lambda-event-sources');
import s3 = require('@aws-cdk/aws-s3');
import cdk = require('@aws-cdk/cdk');

import { Cache, Clients, Dependency, Function, PropertyBag, Runtime } from '../compute';
import { Cons } from '../compute/hlist';
import { DeliveryStream, DeliveryStreamDestination, DeliveryStreamType } from '../data-lake/delivery-stream';
import { Json, Mapper, RuntimeType, Type } from '../shape';
import { Codec } from '../storage';
import { Compression } from '../storage/glue/compression';
import { Bucket } from '../storage/s3';
import { Enumerable, EnumerableRuntime } from './enumerable';
import { Resource } from './resource';
import { Sink, sink, SinkProps } from './sink';
import { Stream } from './stream';

declare module './enumerable' {
  interface Enumerable<E, I, D extends any[], R extends EnumerableRuntime> {
    /**
     * Deliver data to S3 via a Kinesis Firehose Delivery Stream.
     *
     * @param scope construct scope
     * @param id of the flow
     * @param streamProps properties for the delivery stream
     * @param props properties for the enumeration infrastructure (lambda functionse etc.)
     */
    toS3<IT extends Type<I>>(scope: cdk.Construct, id: string, streamProps: S3DeliveryStreamForType<IT>, props?: R): [S3DeliveryStream<IT>, Function<E, void, Dependency.List<Cons<D, S3DeliveryStream<IT>>>>];
  }
}
Enumerable.prototype.toS3 = function(scope: cdk.Construct, id: string, streamProps: S3DeliveryStreamForType<any>): any {
  scope = new cdk.Construct(scope, id);
  return this.collect(scope, 'ToStream', new S3DeliveryStream(scope, 'Stream', streamProps));
};

export type S3DeliveryStreamProps<T extends Type<any>> = S3DeliveryStreamForType<T> | S3DeliveryStreamFromKinesis<T>;

export interface S3DeliveryStreamForType<T extends Type<any>> {
  /**
   * Type of data in the stream.
   */
  type: T;
  /**
   * Codec with which to read files.
   */
  codec: Codec;
  /**
   * Compression of objects.
   */
  compression: Compression;
}

export interface S3DeliveryStreamFromKinesis<T extends Type<any>> {
  /**
   * Kinesis stream to persist in S3.
   */
  stream: Stream<T>;
  /**
   * Codec with which to read files.
   */
  codec: Codec;
  /**
   * Compression of objects.
   */
  compression: Compression;
}

export class S3DeliveryStream<T extends Type<any>> implements Resource<DeliveryStream>, Dependency<S3DeliveryStream.Client<RuntimeType<T>>> {
  public readonly resource: DeliveryStream;
  public readonly type: T;

  private readonly mapper: Mapper<RuntimeType<T>, Buffer>;
  private readonly codec: Codec;
  private readonly compression: Compression;

  constructor(scope: cdk.Construct, id: string, props: S3DeliveryStreamProps<T>) {
    const fromStream = props as S3DeliveryStreamFromKinesis<T>;
    const fromType = props as S3DeliveryStreamForType<T>;

    if (fromStream.stream) {
      this.resource = new DeliveryStream(scope, id, {
        kinesisStream: fromStream.stream.resource,
        destination: DeliveryStreamDestination.S3,
        type: DeliveryStreamType.KinesisStreamAsSource,
        compression: props.compression.type
      });
      this.type = fromStream.stream.type;
        // TODO: validate with a function?
    } else {
      this.resource =  new DeliveryStream(scope, id, {
        destination: DeliveryStreamDestination.S3,
        type: DeliveryStreamType.DirectPut,
        compression: fromType.compression.type,
        // TODO: validate with a function?
      });
      this.type = fromType.type;
    }
    this.mapper = props.codec.mapper(this.type);
    this.codec = props.codec;
    this.compression = props.compression;
  }

  public stream(): EnumerableS3DeliveryStream<T, [Dependency<Bucket.ReadClient>]> {
    return new EnumerableS3DeliveryStream(this, this as any, {
      depends: [new Bucket(this.resource.s3Bucket!).readClient()],
      handle: i => i
    });
  }

  public async *run(event: S3Event, [bucket]: [Bucket.ReadClient]): AsyncIterableIterator<T> {
    for (const record of event.Records) {
      // TODO: parallelism?
      const object = await bucket.getObject({
        Key: record.s3.object.key,
        IfMatch: record.s3.object.eTag
      });
      const buffer = typeof object.Body === 'string' ? Buffer.from(object.Body, 'utf8') : object.Body as Buffer;
      const content = await this.compression.decompress(buffer);
      for (const entry of this.codec.split(content)) {
        yield this.mapper.read(entry);
      }
    }
  }

  public install(target: Runtime): void {
    target.properties.set('deliveryStreamName', this.resource.deliveryStreamName);
    this.resource.grantWrite(target.grantable);
  }

  public bootstrap(properties: PropertyBag, cache: Cache): S3DeliveryStream.Client<RuntimeType<T>> {
    return new S3DeliveryStream.Client(this,
      properties.get('deliveryStreamName'),
      cache.getOrCreate('aws:firehose', () => new AWS.Firehose()));
  }
}

export class EnumerableS3DeliveryStream<T, D extends any[]> extends Enumerable<S3Event, T, D, EnumerableRuntime> {
  constructor(public readonly s3Stream: S3DeliveryStream<any>, previous: EnumerableS3DeliveryStream<any, any>, input: {
    depends: D;
    handle: (value: AsyncIterableIterator<any>, deps: Clients<D>) => AsyncIterableIterator<T>
  }) {
    super(previous, input.handle, input.depends);
  }
  public eventSource(): lambda.IEventSource {
    return new events.S3EventSource(this.s3Stream.resource.s3Bucket!, {
      events: [s3.EventType.ObjectCreated]
    });
  }
  public chain<U, D2 extends any[]>(input: { depends: D2; handle: (value: AsyncIterableIterator<T>, deps: Clients<D2>) => AsyncIterableIterator<U>; }): EnumerableS3DeliveryStream<U, D2> {
    return new EnumerableS3DeliveryStream(this.s3Stream, this, input);
  }
}

export namespace S3DeliveryStream {
  export type PutRecordInput<T> = { Record: T; };

  export class Client<T> implements Sink<T> {
    public readonly mapper: Mapper<T, string>;

    constructor(
        public readonly stream: S3DeliveryStream<Type<T>>,
        public readonly deliveryStreamName: string,
        public readonly client: AWS.Firehose) {
      this.mapper = Json.forType(this.stream.type);
    }

    public putRecord(record: T): Promise<AWS.Firehose.PutRecordOutput> {
      return this.client.putRecord({
        DeliveryStreamName: this.deliveryStreamName,
        Record: {
          Data: this.mapper.write(record)
        }
      }).promise();
    }

    public putRecordBatch(records: T[]): Promise<AWS.Firehose.PutRecordBatchOutput> {
      return this.client.putRecordBatch({
        DeliveryStreamName: this.deliveryStreamName,
        Records: records.map(record => ({
          Data: this.mapper.write(record)
        }))
      }).promise();
    }

    public async sink(records: T[], props?: SinkProps): Promise<void> {
      await sink(records, async values => {
        const res = await this.putRecordBatch(values);
        if (res.FailedPutCount) {
          const redrive: T[] = [];
          res.RequestResponses.forEach((v, i) => {
            if (v.ErrorCode !== undefined) {
              redrive.push(values[i]);
            }
          });
          return redrive;
        }
        return [];
      }, props, 500);
    }
  }
}

export interface S3Event {
  Records: S3Record[];
}

export interface S3Record {
  eventVersion: string;
  eventSource: string;
  awsRegion: string;
  eventTime: string;
  eventName: string;
  requestParameters: RequestParameters;
  responseElements: ResponseElements;
  s3: S3;
}

export interface S3 {
  s3SchemaVersion: string;
  configurationId: string;
  bucket: S3Bucket;
  object: S3Object;
}

export interface S3Object {
  key: string;
  size: number;
  eTag: string;
  sequencer: string;
}

export interface S3Bucket {
  name: string;
  ownerIdentity: UserIdentity;
  arn: string;
}

export interface UserIdentity {
  principalId: string;
}

export interface ResponseElements {
  'x-amz-request-id': string;
  'x-amz-id-2': string;
}
export interface RequestParameters {
  sourceIPAddress: string;
}