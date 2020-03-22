import {Record, any, array, map, string} from "@punchcard/shape";

export namespace Event {
  export class Message extends Record({
    attributes: map(any),
    awsRegion: string,
    body: string,
    eventSource: string,
    eventSourceARN: string,
    md5OfBody: string,
    messageAttributes: map(any),
    messageId: string,
    receiptHandle: string,
  }) {}

  /**
   * Shape of event sent to Lambda when subscribed to a SQS Queue.
   *
   * @see https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
   */
  export class Payload extends Record({
    Records: array(Message),
  }) {}
}
