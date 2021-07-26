import type { LogGroupEventSource } from '@punchcard/constructs';

import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Clients } from '../core/client';
import { Stream } from '../util/stream';
import { Event } from './event';
import { LogGroup } from './log-group';

import type * as lambda from '@aws-cdk/aws-lambda';

/**
 * A `Stream` of events from a CloudWatch Logs log group
 */
export class Events<T, D extends any[]> extends Stream<typeof Event.Payload, T, D, undefined>  {
  constructor(public readonly logGroup: LogGroup<any>, previous: Events<any, any>, input: {
    depends: D;
    handle: (value: AsyncIterableIterator<any>, deps: Clients<D>) => AsyncIterableIterator<T>;
  }) {
    super(previous, input.handle, input.depends);
  }

  public eventSource(): Build<lambda.IEventSource> {
    return this.logGroup.resource.map(logGroup => {
      const c = (require('@punchcard/constructs') as typeof import('@punchcard/constructs'));
      return new c.LogGroupEventSource(logGroup)
    });
  }

  public chain<U, D2 extends any[]>(input: {
    depends: D2;
    handle: (value: AsyncIterableIterator<T>, deps: Clients<D2>) => AsyncIterableIterator<U>
  }): Stream<typeof Event.Payload, U, D2, undefined> {
    return new Events<U, D2>(this.logGroup, this, input);
  }
}
