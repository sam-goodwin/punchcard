import { array, map, Record, string } from '@punchcard/shape';

export namespace Event {
  export class MesssageAttribute extends Record({
    Type: string,
    Value: string
  }) {}

  export class Sns extends Record({
    SignatureVersion: string,
    Timestamp: string,
    Signature: string,
    SigningCertUrl: string,
    MessageId: string,
    Message: string,
    MessageAttributes: map(MesssageAttribute),
    Type: string,
    UnsubscribeUrl: string,
    TopicArn: string,
    Subject: string
  }) {}

  export class Notification extends Record({
    EventVersion: string,
    EventSubscriptionArn: string,
    EventSource: string,
    Sns
  }) {}

  /**
   * @see https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
   */
  export class Payload extends Record({
    Records: array(Notification)
  }) {}
}
