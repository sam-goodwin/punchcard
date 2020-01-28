/**
 * @see https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
 */
export interface Event {
  Records: Array<{
    EventVersion: string;
    EventSubscriptionArn: string;
    EventSource: string;
    Sns: {
      SignatureVersion: string;
      Timestamp: string;
      Signature: string;
      SigningCertUrl: string;
      MessageId: string;
      Message: string;
      MessageAttributes: { [key: string]: {
        Type: string;
        Value: string;
      }}
      Type: string;
      UnsubscribeUrl: string;
      TopicArn: string;
      Subject: string;
    }
  }>
}
