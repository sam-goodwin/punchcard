import { any, array, Enum, integer, map, number, optional, string, Type } from "@punchcard/shape";
import { bigint } from "@punchcard/shape-hive";

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
  export const StreamViewType = Enum({
    KEYS_ONLY: 'KEYS_ONLY',
    NEW_IMAGE: 'NEW_IMAGE',
    OLD_IMAGE: 'OLD_IMAGE',
    NEW_AND_OLD_IMAGES: 'NEW_AND_OLD_IMAGES',
  });
  export class DynamoDB extends Type({
    ApproximateCreationDateTime: optional(number),
    Keys: optional(map(any)),
    NewImage: optional(map(any)),
    OldImage: optional(map(any)),
    SequenceNumber: optional(integer),
    SizeBytes: optional(integer),
    StreamViewType: optional(StreamViewType)
  }) {}

  /**
   * @see https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_streams_Record.html
   */
  export class DataRecord extends Type({
    dynamodb: DynamoDB,
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
