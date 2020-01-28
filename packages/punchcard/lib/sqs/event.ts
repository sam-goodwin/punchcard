/**
 * Shape of event sent to Lambda when subscribed to a SQS Queue.
 *
 * @see https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
 */
export interface Event {
  Records: EventRecord[];
}
export interface EventRecord {
  messageId: string;
  receiptHandle: string;
  body: string;
  attributes: { [key: string]: any };
  messageAttributes: { [key: string]: any };
  md5OfBody: string;
  eventSource: string;
  eventSourceARN: string;
  awsRegion: string;
}
