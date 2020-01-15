import { array, map, Shape, string } from "@punchcard/shape";
import { Value } from "@punchcard/shape-runtime";

/**
 * Shape of event sent to Lambda when subscribed to a SQS Queue.
 *
 * @see https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
 */
export interface Event extends Value.Of<EventShape> {}

export interface EventShape extends Shape.Of<typeof EventType> {}

export class EventRecordType {
  messageId = string;
  receiptHandle = string;
  body = string;
  attributes = map(string);
  messageAttributes = map(string);
  md5OfBody = string;
  eventSource = string;
  eventSourceARN = string;
  awsRegion = string;
}
export class EventType {
  Records = array(EventRecordType);
}
