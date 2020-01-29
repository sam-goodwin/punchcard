import { array, number, Record, string } from "@punchcard/shape";

/**
 * Payload sent to Lambda Function subscribed to a Kinesis Stream.
 *
 * @see https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
 */
export interface Event {
  Records: Array<{
    kinesis: {
      kinesisSchemaVersion: string;
      partitionKey: string;
      sequenceNumber: string;
      data: string;
      approximateArrivalTimestamp: number;
    };
    eventSource: string;
    eventVersion: string;
    eventID: string;
    eventName: string;
    invokeIdentityArn: string;
    awsRegion: string;
    eventSourceARN: string;
  }>;
}

export namespace Event {
  export class Kinesis extends Record({
    kinesisSchemaVersion: string,
    partitionKey: string,
    sequenceNumber: string,
    data: string,
    approximateArrivalTimestamp: number,
  }) {}

  export class DataRecord extends Record({
    kinesis: Kinesis,
    eventSource: string,
    eventVersion: string,
    eventID: string,
    eventName: string,
    invokeIdentityArn: string,
    awsRegion: string,
    eventSourceARN: string
  }) {}

  export class Payload extends Record({
    Records: array(DataRecord)
  }) {}
}
