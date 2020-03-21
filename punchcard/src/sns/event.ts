import {Record, array, map, string} from "@punchcard/shape";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Event {
  export class MesssageAttribute extends Record({
    Type: string,
    Value: string,
  }) {}

  export class Sns extends Record({
    Message: string,
    MessageAttributes: map(MesssageAttribute),
    MessageId: string,
    Signature: string,
    SignatureVersion: string,
    SigningCertUrl: string,
    Subject: string,
    Timestamp: string,
    TopicArn: string,
    Type: string,
    UnsubscribeUrl: string,
  }) {}

  export class Notification extends Record({
    EventSource: string,
    EventSubscriptionArn: string,
    EventVersion: string,
    Sns,
  }) {}

  /**
   * @see https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
   */
  export class Payload extends Record({
    Records: array(Notification),
  }) {}
}
