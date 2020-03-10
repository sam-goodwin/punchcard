import { CDK } from '../core/cdk';
import { Clients } from '../core/client';
import { Stream } from '../util/stream';
import { Bucket } from './bucket';
import { Event } from './event';

import type * as events from '@aws-cdk/aws-lambda-event-sources';

/**
 * A `Stream` of S3 Notifications from a S3 Bucket.
 *
 * @see https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html
 */
export class Notifications<T, D extends any[]> extends Stream<typeof Event.Payload, T, D, events.S3EventSourceProps> {
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
  public eventSource(props?: events.S3EventSourceProps) {
    return CDK.chain(({lambdaEventSources, s3}) => this.bucket.resource.map(bucket => {
      return new lambdaEventSources.S3EventSource(bucket, props || {
        events: [s3.EventType.OBJECT_CREATED],
      });
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
