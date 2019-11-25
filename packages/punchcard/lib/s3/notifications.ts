import events = require('@aws-cdk/aws-lambda-event-sources');
import s3 = require('@aws-cdk/aws-s3');

import { Clients } from '../core/client';
import { Stream } from '../util/stream';
import { Bucket } from './bucket';
import { Event } from './event';

export type ObjectStreamConfig = Stream.Config & events.S3EventSourceProps;

/**
 * A `Stream` of S3 Notifications from a S3 Bucket.
 *
 * @see https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html
 */
export class Notifications<T, D extends any[]> extends Stream<Event, T, D, ObjectStreamConfig> {
  constructor(public readonly bucket: Bucket, previous: Notifications<any, any>, input: {
    depends: D;
    handle: (value: AsyncIterableIterator<any>, deps: Clients<D>) => AsyncIterableIterator<T>;
  }) {
    super(previous, input.handle, input.depends);
  }

  /**
   * Create a `KinesisEventSource` which attaches a Lambda Function to this Stream.
   * @param props optional tuning properties for the event source.
   */
  public eventSource(props?: ObjectStreamConfig) {
    return this.bucket.resource.map(bucket => new events.S3EventSource(bucket, props || {
      events: [s3.EventType.OBJECT_CREATED],
    }));
  }

  /**
   * Chain a computation and dependency pair with this computation.
   * @param input the next computation along with its dependencies.
   */
  public chain<U, D2 extends any[]>(input: {
    depends: D2;
    handle: (value: AsyncIterableIterator<T>, deps: Clients<D2>) => AsyncIterableIterator<U>;
  }): Notifications<U, D2> {
    return new Notifications<U, D2>(this.bucket, this, input);
  }
}