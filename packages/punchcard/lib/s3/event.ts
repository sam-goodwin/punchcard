import { array, number, string, Type } from "@punchcard/shape";

export namespace Event {
  export class RequestParameters extends Type({
    sourceIPAddress: string
  }) {}

  export class ResponseElements extends Type({
    'x-amz-request-id': string,
    'x-amz-id-2': string,
  }) {}

  export class OwnerIdentity extends Type({
    principalId: string
  }) {}

  export class Bucket extends Type({
    name: string,
    ownerIdentity: OwnerIdentity,
    arn: string,
  }) {}

  export class Object extends Type({
    key: string,
    size: number,
    eTag: string,
    sequencer: string,
  }) {}

  export class S3 extends Type({
    s3SchemaVersion: string,
    configurationId: string,
    bucket: Bucket,
    object: Object
  }) {}

  export class Notification extends Type({
    eventVersion: string,
    eventSource: string,
    awsRegion: string,
    eventTime: string,
    eventName: string,
    requestParameters: RequestParameters,
    responseElements: ResponseElements,
    s3: S3
  }) {}

  export class Payload extends Type({
    Records: array(Event.Notification)
  }) {}
}
