import { array, number, Record, string } from "@punchcard/shape";

export namespace Event {
  export class RequestParameters extends Record({
    sourceIPAddress: string
  }) {}

  export class ResponseElements extends Record({
    'x-amz-request-id': string,
    'x-amz-id-2': string,
  }) {}

  export class OwnerIdentity extends Record({
    principalId: string
  }) {}

  export class Bucket extends Record({
    name: string,
    ownerIdentity: OwnerIdentity,
    arn: string,
  }) {}

  export class Object extends Record({
    key: string,
    size: number,
    eTag: string,
    sequencer: string,
  }) {}

  export class S3 extends Record({
    s3SchemaVersion: string,
    configurationId: string,
    bucket: Bucket,
    object: Object
  }) {}

  export class Notification extends Record({
    eventVersion: string,
    eventSource: string,
    awsRegion: string,
    eventTime: string,
    eventName: string,
    requestParameters: RequestParameters,
    responseElements: ResponseElements,
    s3: S3
  }) {}

  export class Payload extends Record({
    Records: array(Event.Notification)
  }) {}
}
