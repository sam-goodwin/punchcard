import { Shape } from '@punchcard/shape';
import { Build } from '../core/build';
import * as Firehose from '../firehose';
import * as Kinesis from '../kinesis';
import * as SNS from '../sns';
import * as SQS from '../sqs';
import { Stream } from './stream';

import type * as cdk from '@aws-cdk/core';

/**
 * Collects data from an `Stream`.
 *
 * @typeparam T type of collected result
 * @typeparam S source Stream
 */
export interface Collector<T, S extends Stream<any, any, any, any>> {
  /**
   * Create Constructs to collect data from the `Stream` and returns the result of that collection.
   */
  collect(scope: Build<cdk.Construct>, id: string, stream: S): T
}

/**
 * Collection of default collectors.
 */
export namespace Collectors {
  /**
   * Collects data from an `Stream` into a new SQS Queue.
   *
   * @param props queue properties
   */
  export function toSQSQueue<T extends Shape>(props: SQS.QueueProps<T>): SQS.QueueCollector<T, any> {
    return new SQS.QueueCollector<T, any>(props);
  }

  /**
   * Collects data from an `Stream` into a new Kinesis Stream.
   *
   * @param props stream properties
   */
  export function toKinesisStream<T extends Shape>(props: Kinesis.StreamProps<T>): Kinesis.StreamCollector<T, any> {
    return new Kinesis.StreamCollector<T, any>(props);
  }

  /**
   * Collects data from an `Stream` into S3 via a Firehose Delivery Stream.
   *
   * @param props stream properties
   */
  export function toFirehoseDeliveryStream<T extends Shape>(props: Firehose.DeliveryStreamDirectPut<T>): Firehose.DeliveryStreamCollector<T, any> {
    return new Firehose.DeliveryStreamCollector<T, any>(props);
  }

  /**
   * Collects data from an `Stream` into a new SNS Topic.
   *
   * @param props topic properties
   */
  export function toSNSTopic<T extends Shape>(props: SNS.TopicProps<T>): SNS.TopicCollector<T, any> {
    return new SNS.TopicCollector<T, any>(props);
  }
}