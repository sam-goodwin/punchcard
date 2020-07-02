import { array, map, string, Type } from '@punchcard/shape';

export namespace Event {
  export class MesssageAttribute extends Type({
    Type: string,
    Value: string
  }) {}

  export class Sns extends Type({
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

  export class Notification extends Type({
    EventVersion: string,
    EventSubscriptionArn: string,
    EventSource: string,
    Sns
  }) {}

  /**
   * @see https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
   */
  export class Payload extends Type({
    Records: array(Notification)
  }) {}
}
