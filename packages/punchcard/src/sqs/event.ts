import { any, array, map, string, Type } from "@punchcard/shape";

export namespace Event {
  export class Message extends Type({
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
  export class Payload extends Type({
    Records: array(Message)
  }) {}
}
