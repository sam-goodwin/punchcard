import events = require('@aws-cdk/aws-lambda-event-sources');

import { Clients } from '../core/client';
import { Stream } from '../util/stream';
import { Event } from './event';
import { Queue } from './queue';

export interface Config extends _Config {}
type _Config = Stream.Config & events.SqsEventSourceProps;

/**
 * A `Stream` of Messages from a SQS Queue.
 */
export class Messages<T, D extends any[]> extends Stream<Event, T, D, Config>  {
  constructor(public readonly queue: Queue<any>, previous: Messages<any, any>, input: {
    depends: D;
    handle: (value: AsyncIterableIterator<any>, deps: Clients<D>) => AsyncIterableIterator<T>;
  }) {
    super(previous, input.handle, input.depends);
  }

  // TODO: this should be passed in at instantiation time!!!
  public eventSource(props?: Config) {
    return this.queue.resource.map(queue => new events.SqsEventSource(queue, props));
  }

  public chain<U, D2 extends any[]>(input: {
    depends: D2;
    handle: (value: AsyncIterableIterator<T>, deps: Clients<D2>) => AsyncIterableIterator<U>;
  }): Messages<U, D2> {
    return new Messages<U, D2>(this.queue, this, input);
  }
}
