import { any, array, map, Record, string } from "@punchcard/shape";

export namespace Event {
  export class Message extends Record({
    messageId: string,
    receiptHandle: string,
    body: string,
    attributes: map(any),
    messageAttributes: map(any),
    md5OfBody: string,
    eventSource: string,
    eventSourceARN: string,
    awsRegion: string,
  }) {}

  /**
   * Shape of event sent to Lambda when subscribed to a SQS Queue.
   *
   * @see https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
   */
  export class Payload extends Record({
    Records: array(Message)
  }) {}
}
