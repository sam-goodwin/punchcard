import AWS = require('aws-sdk');

import cdk = require('@aws-cdk/cdk');

import lambda = require('@aws-cdk/aws-lambda');
import events = require('@aws-cdk/aws-lambda-event-sources');
import sns = require('@aws-cdk/aws-sns');
import { LambdaExecutorService } from '../compute';
import { Cache, PropertyBag } from '../property-bag';
import { Client, ClientContext, Clients, Runtime } from '../runtime';
import { Mapper } from '../shape';
import { Omit } from '../utils';
import { EnumerateProps, IEnumerable } from './collection';
import { Queue } from './queue';

export type TopicProps<T> = {
  mapper: Mapper<T, string>;
} & sns.TopicProps;

export class Topic<T> extends sns.Topic implements Client<Topic.Client<T>>, IEnumerable<T, {}, EnumerateProps> {
  public readonly context = {};
  public readonly mapper: Mapper<T, string>;

  constructor(scope: cdk.Construct, id: string, props: TopicProps<T>) {
    super(scope, id, props);
    this.mapper = props.mapper;
  }

  public subscribeQueue(queue: Queue<T>): sns.Subscription {
    return super.subscribeQueue(queue, true);
  }

  public forBatch(scope: cdk.Construct, id: string, f: (values: T[], clients: Clients<{}>) => Promise<any>, props?: EnumerateProps): lambda.Function {
    return new ContextualizedTopic(this, this.context).forBatch(scope, id, f, props);
  }

  public forEach(scope: cdk.Construct, id: string, f: (value: T, clients: Clients<{}>) => Promise<any>, props?: EnumerateProps): lambda.Function {
    return new ContextualizedTopic(this, this.context).forEach(scope, id, f, props);
  }

  public clients<R2 extends ClientContext>(context: R2): IEnumerable<T, R2, EnumerateProps> {
    return new ContextualizedTopic(this, context);
  }

  public install(target: Runtime): void {
    this.grantPublish(target.grantable);
    target.properties.set('topicArn', this.topicArn);
  }

  public bootstrap(properties: PropertyBag, cache: Cache): Topic.Client<T> {
    return new Topic.Client(this.mapper, properties.get('topicArn'), cache.getOrCreate('aws:sns', () => new AWS.SNS()));
  }
}

export class ContextualizedTopic<T, R extends ClientContext> implements IEnumerable<T, R, EnumerateProps> {
  constructor(private readonly topic: Topic<T>, public readonly context: R) {}

  public forBatch(scope: cdk.Construct, id: string, f: (values: T[], clients: Clients<R>) => Promise<any>, props?: EnumerateProps): lambda.Function {
    props = props || {};
    props.executorService = props.executorService || new LambdaExecutorService({
      memorySize: 128,
      timeout: 10
    });
    const lambdaFn = props.executorService.run(scope, id, {
      clients: this.context,
      handle: async (event: SNSEvent, context) => {
        const records = event.Records.map(record => this.topic.mapper.read(record.Sns.Message));
        await f(records, context);
      }
    });
    lambdaFn.addEventSource(new events.SnsEventSource(this.topic));
    return lambdaFn;
  }

  public forEach(scope: cdk.Construct, id: string, f: (value: T, clients: Clients<R>) => Promise<any>, props?: EnumerateProps): lambda.Function {
    return this.forBatch(scope, id, (values, clients) => Promise.all(values.map(v => f(v, clients))), props);
  }

  public clients<R2 extends ClientContext>(context: R2): IEnumerable<T, R & R2, EnumerateProps> {
    return new ContextualizedTopic(this.topic, {
      ...this.context,
      ...context
    });
  }
}

export namespace Topic {
  export type PublishInput<T> = {Message: T} & Omit<AWS.SNS.PublishInput, 'Message' | 'TopicArn' | 'TargetArn' | 'PhoneNumber'>;
  export type PublishResponse = AWS.SNS.PublishResponse;
  export class Client<T> {
    constructor(
      public readonly mapper: Mapper<T, string>,
      public readonly topicArn: string,
      public readonly client: AWS.SNS) {}

    public publish(request: PublishInput<T>): Promise<PublishResponse> {
      return this.client.publish({
        ...request,
        Message: this.mapper.write(request.Message),
        TopicArn: this.topicArn
      }).promise();
    }
  }
}

/**
 * @see https://docs.aws.amazon.com/lambda/latest/dg/with-sns.html
 */
export interface SNSEvent {
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
      MessageAttributes: {
        [key: string]: {
          Type: string;
          Value: string;
        }
      }
      Type: string;
      UnsubscribeUrl: string;
      TopicArn: string;
      Subject: string;
    }
  }>;
}