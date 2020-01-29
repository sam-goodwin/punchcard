
import lambda = require('@aws-cdk/aws-lambda');
import events = require('@aws-cdk/aws-lambda-event-sources');
import s3 = require('@aws-cdk/aws-s3');

import { Value } from '@punchcard/shape';
import { Build } from '../core/build';
import { Clients } from '../core/client';
import { Event } from '../s3/event';
import { Stream } from '../util/stream';
import { DeliveryStream } from './delivery-stream';

/**
 * A `Stream` of Objects of Records flowing from a Firehose Delivery Stream.
 */
export class Objects<T, D extends any[]> extends Stream<typeof Event.Payload, T, D, Stream.Config> {
  constructor(public readonly s3Stream: DeliveryStream<any>, previous: Objects<any, any>, input: {
    depends: D;
    handle: (value: AsyncIterableIterator<any>, deps: Clients<D>) => AsyncIterableIterator<T>
  }) {
    super(previous, input.handle, input.depends);
  }

  public eventSource(): Build<lambda.IEventSource> {
    return this.s3Stream.resource.map(s3Stream => new events.S3EventSource(s3Stream.s3Bucket!, {
      events: [s3.EventType.OBJECT_CREATED]
    }));
  }

  public chain<U, D2 extends any[]>(input: { depends: D2; handle: (value: AsyncIterableIterator<T>, deps: Clients<D2>) => AsyncIterableIterator<U>; }): Objects<U, D2> {
    return new Objects(this.s3Stream, this, input);
  }
}