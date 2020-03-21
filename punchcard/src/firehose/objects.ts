import * as lambda from "@aws-cdk/aws-lambda";
import {Build} from "../core/build";
import {CDK} from "../core/cdk";
import {Clients} from "../core/client";
import {DeliveryStream} from "./delivery-stream";
import {Event} from "../s3/event";
import {Stream} from "../util/stream";

/**
 * A `Stream` of Objects of Records flowing from a Firehose Delivery Stream.
 */
export class Objects<T, D extends any[]> extends Stream<
  typeof Event.Payload,
  T,
  D,
  undefined
> {
  constructor(
    public readonly s3Stream: DeliveryStream<any>,
    previous: Objects<any, any>,
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

  public eventSource(): Build<lambda.IEventSource> {
    return CDK.chain(({lambdaEventSources, s3}) =>
      this.s3Stream.resource.map(
        (s3Stream) =>
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          new lambdaEventSources.S3EventSource(s3Stream.s3Bucket!, {
            events: [s3.EventType.OBJECT_CREATED],
          }),
      ),
    );
  }

  public chain<U, D2 extends any[]>(input: {
    depends: D2;
    handle: (
      value: AsyncIterableIterator<T>,
      deps: Clients<D2>,
    ) => AsyncIterableIterator<U>;
  }): Objects<U, D2> {
    return new Objects(this.s3Stream, this, input);
  }
}
