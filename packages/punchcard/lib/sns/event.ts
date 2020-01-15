import { array, map, Shape, string } from "@punchcard/shape";
import { Value } from "@punchcard/shape-runtime";

/**
 * @see https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
 */
export interface Event extends Value.Of<typeof EventType> {}

export interface EventShape extends Shape.Of<typeof EventType> {}

export class EventType {
  Records = array(EventRecordType);
}

export class EventRecordType {
  EventVersion = string;
  EventSubscriptionArn = string;
  EventSource = string;
}

export class EventRecordSnsType {
  SignatureVersion = string;
  Timestamp = string;
  Signature = string;
  SigningCertUrl = string;
  MessageId = string;
  Message = string;
  MessageAttributes = map(MessageAttributeType);
  Type = string;
  UnsubscribeUrl = string;
  TopicArn = string;
  Subject = string;
}

export class MessageAttributeType {
  Type = string;
  Value = string;
}