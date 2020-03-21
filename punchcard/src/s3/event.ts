import {Record, array, number, string} from "@punchcard/shape";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Event {
  export class RequestParameters extends Record({
    sourceIPAddress: string,
  }) {}

  export class ResponseElements extends Record({
    "x-amz-id-2": string,
    "x-amz-request-id": string,
  }) {}

  export class OwnerIdentity extends Record({
    principalId: string,
  }) {}

  export class Bucket extends Record({
    arn: string,
    name: string,
    ownerIdentity: OwnerIdentity,
  }) {}

  export class Object extends Record({
    eTag: string,
    key: string,
    sequencer: string,
    size: number,
  }) {}

  export class S3 extends Record({
    bucket: Bucket,
    configurationId: string,
    object: Object,
    s3SchemaVersion: string,
  }) {}

  export class Notification extends Record({
    awsRegion: string,
    eventName: string,
    eventSource: string,
    eventTime: string,
    eventVersion: string,
    requestParameters: RequestParameters,
    responseElements: ResponseElements,
    s3: S3,
  }) {}

  export class Payload extends Record({
    Records: array(Event.Notification),
  }) {}
}
