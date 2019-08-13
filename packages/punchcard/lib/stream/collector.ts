import core = require('@aws-cdk/core');

import { Type } from '../shape/types/type';
import { S3DeliveryStreamCollector, S3DeliveryStreamForType } from './delivery-stream';
import { Kinesis } from './kinesis';
import { SNS } from './sns';
import { SQS } from './sqs';
import { Stream } from './stream';

/**
 * Collects data from an `Enumerable`.
 *
 * @param T type of collected result
 * @param E source enumerable
 */
export interface Collector<T, E extends Stream<any, any, any, any>> {
  /**
   * Create constructs to collect data from the enumerable an
   */
  collect(scope: core.Construct, id: string, enumerable: E): T
}

/**
 * Collection of default collectors.
 */
export namespace Collectors {
  /**
   * Collects data from an `Enumerable` into a new SQS Queue.
   *
   * @param props queue properties
   */
  export function toSQS<T extends Type<any>>(props: SQS.QueueProps<T>): SQS.QueueCollector<T, any> {
    return new SQS.QueueCollector<T, any>(props);
  }

  /**
   * Collects data from an `Enumerable` into a new Kinesis Stream.
   *
   * @param props stream properties
   */
  export function toKinesis<T extends Type<any>>(props: Kinesis.StreamProps<T>): Kinesis.StreamCollector<T, any> {
    return new Kinesis.StreamCollector<T, any>(props);
  }

  /**
   * Collects data from an `Enumerable` into S3 via a Firehose Delivery Stream.
   *
   * @param props stream properties
   */
  export function toS3DeliveryStream<T extends Type<any>>(props: S3DeliveryStreamForType<T>): S3DeliveryStreamCollector<T, any> {
    return new S3DeliveryStreamCollector<T, any>(props);
  }

  /**
   * Collects data from an `Enumerable` into a new SNS Topic.
   *
   * @param props topic properties
   */
  export function toSNS<T extends Type<any>>(props: SNS.TopicProps<T>): SNS.TopicCollector<T, any> {
    return new SNS.TopicCollector<T, any>(props);
  }
}