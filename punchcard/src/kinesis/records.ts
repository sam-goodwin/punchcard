import * as eventSources from "@aws-cdk/aws-lambda-event-sources";
import {CDK} from "../core/cdk";
import {Clients} from "../core/client";
import {Event} from "./event";
import {Stream as SStream} from "../util/stream";
import {Stream} from "./stream";

/**
 * A `Stream` of Records from a Kinesis Stream.
 */
export class Records<T, D extends any[]> extends SStream<
  typeof Event.Payload,
  T,
  D,
  eventSources.KinesisEventSourceProps
> {
  constructor(
    public readonly stream: Stream<any>,
    previous: Records<any, any>,
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

  /**
   * Create a `KinesisEventSource` which attaches a Lambda Function to this Stream.
   * @param props - optional tuning properties for the event source.
   */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public eventSource(props?: eventSources.KinesisEventSourceProps) {
    return CDK.chain(({lambda, lambdaEventSources}) =>
      this.stream.resource.map(
        (stream) =>
          new lambdaEventSources.KinesisEventSource(
            stream,
            props || {
              batchSize: 100,
              startingPosition: lambda.StartingPosition.TRIM_HORIZON,
            },
          ),
      ),
    );
  }

  /**
   * Chain a computation and dependency pair with this computation.
   * @param input - the next computation along with its dependencies.
   */
  public chain<U, D2 extends any[]>(input: {
    depends: D2;
    handle: (
      value: AsyncIterableIterator<T>,
      deps: Clients<D2>,
    ) => AsyncIterableIterator<U>;
  }): Records<U, D2> {
    return new Records<U, D2>(this.stream, this, input);
  }
}
