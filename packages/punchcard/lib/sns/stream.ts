import events = require('@aws-cdk/aws-lambda-event-sources');

import { Clients } from '../dependency';
import { Stream } from '../stream';
import { Event } from './event';
import { Topic } from './topic';

/**
 * A stream of notifications from a SNS `Topic`.
 */
export class TopicStream<T, D extends any[]> extends Stream<Event, T, D, Stream.Config>  {
  constructor(public readonly topic: Topic<any>, previous: TopicStream<any, any>, input: {
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
  }): TopicStream<U, D2> {
    return new TopicStream<U, D2>(this.topic, this, input);
  }
}
