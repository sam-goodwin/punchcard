import { array, number, string, Type } from "@punchcard/shape";

/**
 * Payload sent to Lambda Function subscribed to a Kinesis Stream.
 *
 * @see https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
 */
export interface Event {
  Records: {
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
  }[];
}

export namespace Event {
  export class Kinesis extends Type({
    kinesisSchemaVersion: string,
    partitionKey: string,
    sequenceNumber: string,
    data: string,
    approximateArrivalTimestamp: number,
  }) {}

  export class DataRecord extends Type({
    kinesis: Kinesis,
    eventSource: string,
    eventVersion: string,
    eventID: string,
    eventName: string,
    invokeIdentityArn: string,
    awsRegion: string,
    eventSourceARN: string
  }) {}

  export class Payload extends Type({
    Records: array(DataRecord)
  }) {}
}
