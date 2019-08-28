import events = require('@aws-cdk/aws-lambda-event-sources');

import { Clients } from '../core/client';
import { Stream } from '../util/stream';
import { Event } from './event';
import { Topic } from './topic';

/**
 * A `Stream` of Notifications from a SNS Topic.
 */
export class Notifications<T, D extends any[]> extends Stream<Event, T, D, Stream.Config>  {
  constructor(public readonly topic: Topic<any>, previous: Notifications<any, any>, input: {
    depends: D;
    handle: (value: AsyncIterableIterator<any>, deps: Clients<D>) => AsyncIterableIterator<T>;
  }) {
    super(previous, input.handle, input.depends);
  }

  /**
   * Create a `SnsEventSource` which attaches a Lambda Function to this `Topic`.
   */
  public eventSource() {
    return new events.SnsEventSource(this.topic.resource);
  }

  /**
   * Chain a computation and dependency pair with this computation.
   * @param input the next computation along with its dependencies.
   */
  public chain<U, D2 extends any[]>(input: {
    depends: D2;
    handle: (value: AsyncIterableIterator<T>, deps: Clients<D2>) => AsyncIterableIterator<U>;
  }): Notifications<U, D2> {
    return new Notifications<U, D2>(this.topic, this, input);
  }
}
