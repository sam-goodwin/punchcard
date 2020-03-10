import AWS = require('aws-sdk');

import { Mapper, Shape, ShapeOrRecord, Value } from '@punchcard/shape';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import * as Kinesis from '../kinesis';
import { ExecutorService } from '../lambda/executor';
import { Function } from '../lambda/function';
import * as S3 from '../s3';
import { Compression } from '../util/compression';
import { Client } from './client';
import { FirehoseEvent, FirehoseResponse, FirehoseResponseRecord, ValidationResult } from './event';
import { Objects } from './objects';

import { DataType } from '@punchcard/shape-hive';

import type * as cdk from '@aws-cdk/core';
import type { DeliveryStream as DeliveryStreamConstruct } from '@punchcard/constructs';
import { Duration } from '../core/duration';

export type DeliveryStreamProps<T extends ShapeOrRecord> = DeliveryStreamDirectPut<T> | DeliveryStreamFromKinesis<T>;

interface BaseDeliveryStreamProps<T extends ShapeOrRecord> {
  /**
   * Compression of objects.
   */
  compression: Compression;

  /**
   * Override to tune configuration of the delivery stream transform function.
   */
  executorService?: ExecutorService;

  /**
   * Optional function to validate data being written by Firehose.
   *
   * @default no validation
   */
  validate?: (record: Value.Of<T>) => ValidationResult;
}

export interface DeliveryStreamDirectPut<T extends ShapeOrRecord> extends BaseDeliveryStreamProps<T> {
  /**
   * Type of data in the stream.
   */
  shape: T;
}

export interface DeliveryStreamFromKinesis<T extends ShapeOrRecord> extends BaseDeliveryStreamProps<T> {
  /**
   * Kinesis stream to persist in S3.
   */
  stream: Kinesis.Stream<T>;
}

/**
 * A Firehose Delivery Stream writing data to a S3 bucket.
 *
 * It may or may not be consuming from a Kinesis Stream.
 */
export class DeliveryStream<T extends ShapeOrRecord> implements Resource<DeliveryStreamConstruct> {
  public readonly bucket: S3.Bucket;
  public readonly processor: Validator<Value.Of<T>>;
  public readonly resource: Build<DeliveryStreamConstruct>;
  public readonly shape: T;

  public readonly compression: Compression;
  public readonly dataType: DataType;
  public readonly mapper: Mapper<Value.Of<T>, Buffer>;

  constructor(_scope: Build<cdk.Construct>, id: string, props: DeliveryStreamProps<T>) {
    const scope = CDK.chain(({core}) => _scope.map(scope => new core.Construct(scope, id)));

    const fromStream = props as DeliveryStreamFromKinesis<T>;
    const fromType = props as DeliveryStreamDirectPut<T>;

    this.dataType = DataType.Json;
    if (fromStream.stream) {
      this.shape = fromStream.stream.shape;
    } else {
      this.shape = fromType.shape;
    }
    this.mapper = this.dataType.mapper(Shape.of(this.shape));
    this.compression = props.compression;

    this.processor = new Validator(scope, 'Validator', {
      mapper: this.mapper,
      validate: props.validate
    });

    if (fromStream.stream) {
      this.resource = scope.chain(scope =>
        this.processor.processor.resource.chain(transformFunction =>
          fromStream.stream.resource.map(kinesisStream => {
            const c = (require('@punchcard/constructs') as typeof import('@punchcard/constructs'));
            return new c.DeliveryStream(scope, 'DeliveryStream', {
              kinesisStream,
              destination: c.DeliveryStreamDestination.S3,
              type: c.DeliveryStreamType.KinesisStreamAsSource,
              compression: props.compression.type,
              transformFunction
            });
          })));
    } else {
      this.resource = scope.chain(scope =>
        this.processor.processor.resource.map(transformFunction => {
          const c = (require('@punchcard/constructs') as typeof import('@punchcard/constructs'));
          return new c.DeliveryStream(scope, 'DeliveryStream', {
            destination: c.DeliveryStreamDestination.S3,
            type: c.DeliveryStreamType.DirectPut,
            compression: props.compression.type,
            transformFunction
          });
        }));
    }

    this.bucket = new S3.Bucket(this.resource.map(ds => ds.s3Bucket!));
  }

  public objects(): Objects<Value.Of<T>, [Dependency<S3.ReadClient>]> {
    const codec = this.dataType;
    const compression = this.compression;
    const mapper = this.mapper;
    class Root extends Objects<Value.Of<T>, [Dependency<S3.ReadClient>]> {
      public async *run(event: S3.Event.Payload, [bucket]: [S3.ReadClient]) {
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
      depends: [this.bucket.readAccess()],
      handle: i => i
    });
  }

  public writeAccess(): Dependency<Client<T>> {
    return {
      install: this.resource.map(ds => (ns, grantable) => {
        ns.set('deliveryStreamName', ds.deliveryStreamName);
        ds.grantWrite(grantable);
      }),
      bootstrap: Run.of(async (ns, cache) => new Client(this,
        ns.get('deliveryStreamName'),
        cache.getOrCreate('aws:firehose', () => new AWS.Firehose())))
    };
  }
}

/**
 * Properties for creating a Validator.
 */
interface ValidatorProps<S> {
  mapper: Mapper<S, Buffer>;

  /**
   * Optionally provide an executorService to override the properties
   * of the created Lambda Function.
   *
   * @default executorService with `memorySize: 256` and `timeout: 60`.
   */
  executorService?: ExecutorService;

  /**
   * Additional validation logic to apply to each record.
   *
   * @default no extra validation
   */
  validate?: (record: S) => ValidationResult;
}

/**
 * Validates and formats records flowing from Firehose so that they match the format of a Glue Table.
 */
class Validator<T> {
  public readonly processor: Function<typeof FirehoseEvent, typeof FirehoseResponse, Dependency.None>;

  constructor(_scope: Build<cdk.Construct>, id: string, props: ValidatorProps<T>) {
    const scope = CDK.chain(({core}) => _scope.map(scope => new core.Construct(scope, id)));
    const executorService = props.executorService || new ExecutorService({
      memorySize: 256,
      timeout: Duration.seconds(60)
    });

    this.processor = executorService.spawn(scope, 'Processor', {
      request: FirehoseEvent,
      response: FirehoseResponse,
      depends: Dependency.none,
    }, async (event: FirehoseEvent) => {
      const response: FirehoseResponse = new FirehoseResponse({records: []});
      event.records.forEach(record => {
        try {
          const data = Buffer.from(record.data, 'base64');
          const parsed = props.mapper.read(data);
          let result = ValidationResult.Ok;
          if (props.validate) {
            result = props.validate(parsed);
          }
          response.records.push(new FirehoseResponseRecord({
            result: props.validate ? props.validate(parsed) : ValidationResult.Ok,
            recordId: record.recordId,
            data: result === ValidationResult.Ok
              ? props.mapper.write(parsed).toString('base64') // re-format the data if OK
              : record.data // original record if dropped or processing failed
          }));
        } catch (err) {
          console.error(err);
          response.records.push(new FirehoseResponseRecord({
            result: ValidationResult.ProcessingFailed,
            recordId: record.recordId,
            data: record.data
          }));
        }
      });
      return response;
    });
  }
}
