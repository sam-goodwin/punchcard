import { CDK } from '../core/cdk';
import { Clients } from '../core/client';
import { Stream as SStream } from '../util/stream';
import { Event } from './event';

import type * as eventSources from '@aws-cdk/aws-lambda-event-sources';
import { Table } from './table';

/**
 * A `Stream` of Records from a DynamoDB Table.
 */
export class Stream<T, D extends any[]> extends SStream<typeof Event.Payload, T, D, eventSources.DynamoEventSourceProps>  {
  constructor(public readonly table: Table<any, any>, previous: Stream<any, any>, input: {
    depends: D;
    handle: (value: AsyncIterableIterator<any>, deps: Clients<D>) => AsyncIterableIterator<T>;
  }) {
    super(previous, input.handle, input.depends);
  }

  /**
   * Create a `KinesisEventSource` which attaches a Lambda Function to this Stream.
   * @param props optional tuning properties for the event source.
   */
  public eventSource(props?: eventSources.DynamoEventSourceProps) {
    return CDK.chain(({lambda, lambdaEventSources}) => this.table.resource.map(table =>
      new lambdaEventSources.DynamoEventSource(table, props || {
        batchSize: 100,
        startingPosition: lambda.StartingPosition.TRIM_HORIZON
      })));
  }

  /**
   * Chain a computation and dependency pair with this computation.
   * @param input the next computation along with its dependencies.
   */
  public chain<U, D2 extends any[]>(input: {
    depends: D2;
    handle: (value: AsyncIterableIterator<T>, deps: Clients<D2>) => AsyncIterableIterator<U>;
  }): Stream<U, D2> {
    return new Stream<U, D2>(this.table, this, input);
  }
}
