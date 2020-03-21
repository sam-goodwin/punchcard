import {Record, array, number, string} from "@punchcard/shape";

/**
 * Payload sent to Lambda Function subscribed to a Kinesis Stream.
 *
 * @see https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
 */
export interface Event {
  Records: {
    awsRegion: string;
    eventID: string;
    eventName: string;
    eventSource: string;
    eventSourceARN: string;
    eventVersion: string;
    invokeIdentityArn: string;
    kinesis: {
      approximateArrivalTimestamp: number;
      data: string;
      kinesisSchemaVersion: string;
      partitionKey: string;
      sequenceNumber: string;
    };
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Event {
  export class Kinesis extends Record({
    approximateArrivalTimestamp: number,
    data: string,
    kinesisSchemaVersion: string,
    partitionKey: string,
    sequenceNumber: string,
  }) {}

  export class DataRecord extends Record({
    awsRegion: string,
    eventID: string,
    eventName: string,
    eventSource: string,
    eventSourceARN: string,
    eventVersion: string,
    invokeIdentityArn: string,
    kinesis: Kinesis,
  }) {}

  export class Payload extends Record({
    Records: array(DataRecord),
  }) {}
}
