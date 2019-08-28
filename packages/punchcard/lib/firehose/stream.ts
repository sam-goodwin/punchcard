
import lambda = require('@aws-cdk/aws-lambda');
import events = require('@aws-cdk/aws-lambda-event-sources');
import s3 = require('@aws-cdk/aws-s3');

import { Clients } from '../core/client';
import { Event as S3Event } from '../s3/event';
import { Stream } from '../util/stream';
import { DeliveryStream } from './delivery-stream';

export class DeliveryStreamStream<T, D extends any[]> extends Stream<S3Event, T, D, Stream.Config> {
  constructor(public readonly s3Stream: DeliveryStream<any>, previous: DeliveryStreamStream<any, any>, input: {
    depends: D;
    handle: (value: AsyncIterableIterator<any>, deps: Clients<D>) => AsyncIterableIterator<T>
  }) {
    super(previous, input.handle, input.depends);
  }

  public eventSource(): lambda.IEventSource {
    return new events.S3EventSource(this.s3Stream.resource.s3Bucket!, {
      events: [s3.EventType.OBJECT_CREATED]
    });
  }

  public chain<U, D2 extends any[]>(input: { depends: D2; handle: (value: AsyncIterableIterator<T>, deps: Clients<D2>) => AsyncIterableIterator<U>; }): DeliveryStreamStream<U, D2> {
    return new DeliveryStreamStream(this.s3Stream, this, input);
  }
}