import events = require('@aws-cdk/aws-lambda-event-sources');

import { Clients } from '../core/client';
import { Stream } from '../core/stream';
import { Event } from './event';
import { Queue } from './queue';

export type Config = Stream.Config & events.SqsEventSourceProps;

export class QueueStream<T, D extends any[]> extends Stream<Event, T, D, Config>  {
  constructor(public readonly queue: Queue<any>, previous: QueueStream<any, any>, input: {
    depends: D;
    handle: (value: AsyncIterableIterator<any>, deps: Clients<D>) => AsyncIterableIterator<T>;
  }) {
    super(previous, input.handle, input.depends);
  }

  public eventSource(props?: Config) {
    return new events.SqsEventSource(this.queue.resource, props);
  }

  public chain<U, D2 extends any[]>(input: {
    depends: D2;
    handle: (value: AsyncIterableIterator<T>, deps: Clients<D2>) => AsyncIterableIterator<U>;
  }): QueueStream<U, D2> {
    return new QueueStream<U, D2>(this.queue, this, input);
  }
}
