import AWS = require('aws-sdk');

import iam = require('@aws-cdk/aws-iam');
import lambda = require('@aws-cdk/aws-lambda');
import events = require('@aws-cdk/aws-lambda-event-sources');
import s3 = require('@aws-cdk/aws-s3');
import core = require('@aws-cdk/core');

import { Clients, Dependency, Function, LambdaExecutorService } from '../compute';
import { Assembly, Cache, Namespace } from '../compute/assembly';
import { Cons } from '../compute/hlist';
import { DeliveryStream, DeliveryStreamDestination, DeliveryStreamType } from '../data-lake/delivery-stream';
import { Json, Mapper, RuntimeType, Type } from '../shape';
import { Codec } from '../storage';
import { Compression } from '../storage/compression';
import { Bucket } from '../storage/s3';
import { Collector } from './collector';
import { DependencyType, Enumerable, EnumerableRuntime, EventType } from './enumerable';
import { Sink, sink, SinkProps } from './sink';
import { Stream } from './stream';

export type S3DeliveryStreamProps<T extends Type<any>> = S3DeliveryStreamForType<T> | S3DeliveryStreamFromKinesis<T>;

interface DeliveryStreamProps<T extends Type<any>> {
  /**
   * Codec with which to read files.
   */
  codec: Codec;

  /**
   * Compression of objects.
   */
  compression: Compression;

  /**
   * Override to tune configuration of the delivery stream transform function.
   */
  executorService?: LambdaExecutorService;

  /**
   * Optional function to validate data being written by Firehose.
   *
   * @default no validation
   */
  validate?: (record: RuntimeType<T>) => ValidationResult;
}
export interface S3DeliveryStreamForType<T extends Type<any>> extends DeliveryStreamProps<T> {
  /**
   * Type of data in the stream.
   */
  type: T;
}

export interface S3DeliveryStreamFromKinesis<T extends Type<any>> extends DeliveryStreamProps<T> {
  /**
   * Kinesis stream to persist in S3.
   */
  stream: Stream<T>;
}

/**
 * A Firehose Delivery Stream writing data to a S3 bucket.
 *
 * It may or may not be consuming from a Kinesis Stream.
 */
export class S3DeliveryStream<T extends Type<any>> extends core.Construct implements Dependency<S3DeliveryStream.Client<RuntimeType<T>>> {
  public readonly deliveryStream: DeliveryStream;
  public readonly type: T;

  private readonly mapper: Mapper<RuntimeType<T>, Buffer>;
  private readonly codec: Codec;
  private readonly compression: Compression;
  public readonly processor: Validator<T>;

  constructor(scope: core.Construct, id: string, props: S3DeliveryStreamProps<T>) {
    super(scope, id);
    const fromStream = props as S3DeliveryStreamFromKinesis<T>;
    const fromType = props as S3DeliveryStreamForType<T>;

    if (fromStream.stream) {
      this.type = fromStream.stream.type;
    } else {
      this.type = fromType.type;
    }
    this.mapper = props.codec.mapper(this.type);
    this.codec = props.codec;
    this.compression = props.compression;
    this.processor = new Validator(this, 'Validator', {
      mapper: this.mapper,
      validate: props.validate
    });

    if (fromStream.stream) {
      this.deliveryStream = new DeliveryStream(this, 'DeliveryStream', {
        kinesisStream: fromStream.stream.resource,
        destination: DeliveryStreamDestination.S3,
        type: DeliveryStreamType.KinesisStreamAsSource,
        compression: props.compression.type,
        transformFunction: this.processor.processor
      });
    } else {
      this.deliveryStream =  new DeliveryStream(this, 'DeliveryStream', {
        destination: DeliveryStreamDestination.S3,
        type: DeliveryStreamType.DirectPut,
        compression: fromType.compression.type,
        transformFunction: this.processor.processor
      });
    }
  }

  public enumerable(): EnumerableS3DeliveryStream<RuntimeType<T>, [Dependency<Bucket.ReadClient>]> {
    const codec = this.codec;
    const compression = this.compression;
    const mapper = this.mapper;
    class Root extends EnumerableS3DeliveryStream<RuntimeType<T>, [Dependency<Bucket.ReadClient>]> {
      public async *run(event: S3Event, [bucket]: [Bucket.ReadClient]) {
        for (const record of event.Records) {
          // TODO: parallelism
          // TODO: streaming I/O
          const object = await bucket.getObject({
            Key: record.s3.object.key,
            IfMatch: record.s3.object.eTag
          });
          const buffer = typeof object.Body === 'string' ? Buffer.from(object.Body, 'utf8') : object.Body as Buffer;
          const content = await compression.decompress(buffer);
          for (const entry of codec.split(content)) {
            yield mapper.read(entry);
          }
        }
      }
    }
    return new Root(this, undefined as any, {
      depends: [new Bucket(this.deliveryStream.s3Bucket!).readAccess()],
      handle: i => i
    });
  }

  public install(namespace: Namespace, grantable: iam.IGrantable): void {
    namespace.set('deliveryStreamName', this.deliveryStream.deliveryStreamName);
    this.deliveryStream.grantWrite(grantable);
  }

  public async bootstrap(properties: Assembly, cache: Cache): Promise<S3DeliveryStream.Client<RuntimeType<T>>> {
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
    return new events.S3EventSource(this.s3Stream.deliveryStream.s3Bucket!, {
      events: [s3.EventType.OBJECT_CREATED]
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
      this.mapper = Json.jsonLine(this.stream.type);
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
  requestParameters: {
    sourceIPAddress: string;
  };
  responseElements: {
    'x-amz-request-id': string;
    'x-amz-id-2': string;
  };
  s3: {
    s3SchemaVersion: string;
    configurationId: string;
    bucket: {
      name: string;
      ownerIdentity: {
        principalId: string;
      };
      arn: string;
    };
    object: {
      key: string;
      size: number;
      eTag: string;
      sequencer: string;
    };
  };
}

/**
 * Properties for creating a Validator.
 */
export interface ValidatorProps<T extends Type<any>> {
  mapper: Mapper<RuntimeType<T>, Buffer>;

  /**
   * Optionally provide an executorService to override the properties
   * of the created Lambda Function.
   *
   * @default executorService with `memorySize: 256` and `timeout: 60`.
   */
  executorService?: LambdaExecutorService;

  /**
   * Additional validation logic to apply to each record.
   *
   * @default no extra validation
   */
  validate?: (record: RuntimeType<T>) => ValidationResult;
}

/**
 * Validates and formats records flowing from Firehose so that they match the format of a Glue Table.
 */
export class Validator<T extends Type<any>> extends core.Construct {
  public readonly processor: Function<FirehoseEvent, FirehoseResponse, Dependency.None>;

  constructor(scope: core.Construct, id: string, props: ValidatorProps<T>) {
    super(scope, id);
    const executorService = props.executorService || new LambdaExecutorService({
      memorySize: 256,
      timeout: core.Duration.seconds(60)
    });

    this.processor = executorService.spawn(this, 'Processor', {
      depends: Dependency.none,
      handle: async (event: FirehoseEvent) => {
        const response: FirehoseResponse = {records: []};
        event.records.forEach(record => {
          try {
            const data = new Buffer(record.data, 'base64');
            const parsed = props.mapper.read(data);
            let result = ValidationResult.Ok;
            if (props.validate) {
              result = props.validate(parsed);
            }
            response.records.push({
              result: props.validate ? props.validate(parsed) : ValidationResult.Ok,
              recordId: record.recordId,
              data: result === ValidationResult.Ok
                ? props.mapper.write(parsed).toString('base64') // re-format the data if OK
                : record.data // original record if dropped or processing failed
            });
          } catch (err) {
            response.records.push({
              result: ValidationResult.ProcessingFailed,
              recordId: record.recordId,
              data: record.data
            });
          }
        });
        return response;
      }
    });
  }
}

interface FirehoseEvent {
  records: Array<{
    recordId: string;
    data: string;
  }>
}

interface FirehoseResponse {
  records: Array<{
    recordId: string;
    result: ValidationResult;
    data: string;
  }>
}

export enum ValidationResult {
  Dropped = 'Dropped',
  Ok = 'Ok',
  ProcessingFailed = 'ProcessingFailed'
}

/**
 * Creates a new SNS `S3DeliveryStream` and publishes data from an enumerable to it.
 *
 * @typeparam T type of notififcations sent to (and emitted from) the SNS S3DeliveryStream.
 */
export class S3DeliveryStreamCollector<T extends Type<any>, E extends Enumerable<any, RuntimeType<T>, any, any>> implements Collector<CollectedS3DeliveryStream<T, E>, E> {
  constructor(private readonly props: S3DeliveryStreamForType<T>) { }

  public collect(scope: core.Construct, id: string, enumerable: E): CollectedS3DeliveryStream<T, E> {
    return new CollectedS3DeliveryStream(scope, id, {
      ...this.props,
      enumerable
    });
  }
}

/**
 * Properties for creating a collected `S3DeliveryStream`.
 */
export interface CollectedS3DeliveryStreamProps<T extends Type<any>, E extends Enumerable<any, RuntimeType<T>, any, any>> extends S3DeliveryStreamForType<T> {
  /**
   * Source of the data; an enumerable.
   */
  readonly enumerable: E;
}

/**
 * A SNS `S3DeliveryStream` produced by collecting data from an `Enumerable`.
 * @typeparam T type of notififcations sent to, and emitted from, the SNS S3DeliveryStream.
 */
export class CollectedS3DeliveryStream<T extends Type<any>, E extends Enumerable<any, any, any, any>> extends S3DeliveryStream<T> {
  public readonly sender: Function<EventType<E>, void, Dependency.List<Cons<DependencyType<E>, Dependency<S3DeliveryStream.Client<T>>>>>;

  constructor(scope: core.Construct, id: string, props: CollectedS3DeliveryStreamProps<T, E>) {
    super(scope, id, props);
    this.sender = props.enumerable.forBatch(this.deliveryStream, 'ToS3DeliveryStream', {
      depends: this,
      handle: async (events, self) => {
        self.sink(events);
      }
    }) as any;
  }
}

/**
 * Add a utility method `toS3DeliveryStream` for `Enumerable` which uses the `S3DeliveryStreamCollector` to collect
 * data to S3 via a Kinesis Firehose Delivery Stream.
 */
declare module './enumerable' {
  interface Enumerable<E, I, D extends any[], R extends EnumerableRuntime> {
    /**
     * Collect data to S3 via a Firehose Delivery Stream.
     *
     * @param scope
     * @param id
     * @param s3DeliveryStreamProps properties of the created s3 delivery stream
     * @param runtimeProps optional runtime properties to configure the function processing the enumerable's data.
     * @typeparam T concrete type of data flowing to s3
     */
    toS3<T extends Type<I>>(scope: core.Construct, id: string, s3DeliveryStreamProps: S3DeliveryStreamForType<T>, runtimeProps?: R): CollectedS3DeliveryStream<T, this>;
  }
}
Enumerable.prototype.toS3 = function(scope: core.Construct, id: string, props: S3DeliveryStreamForType<any>): any {
  return this.collect(scope, id, new S3DeliveryStreamCollector(props));
};
