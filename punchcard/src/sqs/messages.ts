import * as events from "@aws-cdk/aws-lambda-event-sources";
import {Build} from "../core/build";
import {CDK} from "../core/cdk";
import {Clients} from "../core/client";
import {Event} from "./event";
import {Queue} from "./queue";
import {Stream} from "../util/stream";

/**
 * A `Stream` of Messages from a SQS Queue.
 */
export class Messages<T, D extends any[]> extends Stream<
  typeof Event.Payload,
  T,
  D,
  events.SqsEventSourceProps
> {
  constructor(
    public readonly queue: Queue<any>,
    previous: Messages<any, any>,
    input: {
      depends: D;
      handle: (
        value: AsyncIterableIterator<any>,
        deps: Clients<D>,
      ) => AsyncIterableIterator<T>;
    },
  ) {
    super(previous, input.handle, input.depends);
  }

  // TODO: this should be passed in at instantiation time!!!
  public eventSource(
    props?: events.SqsEventSourceProps,
  ): Build<events.SqsEventSource> {
    return CDK.chain(({lambdaEventSources}) =>
      this.queue.resource.map(
        (queue) => new lambdaEventSources.SqsEventSource(queue, props),
      ),
    );
  }

  public chain<U, D2 extends any[]>(input: {
    depends: D2;
    handle: (
      value: AsyncIterableIterator<T>,
      deps: Clients<D2>,
    ) => AsyncIterableIterator<U>;
  }): Messages<U, D2> {
    return new Messages<U, D2>(this.queue, this, input);
  }
}
