import AWS = require('aws-sdk');

import cdk = require('@aws-cdk/cdk');

import { IEventSource } from '@aws-cdk/aws-lambda';
import events = require('@aws-cdk/aws-lambda-event-sources');
import { SnsEventSource } from '@aws-cdk/aws-lambda-event-sources';
import sns = require('@aws-cdk/aws-sns');
import { Cache, PropertyBag } from '../property-bag';
import { Clients, Dependencies, Dependency, Runtime } from '../runtime';
import { Json, Mapper, Type } from '../shape';
import { Omit } from '../utils';
import { Functor, FunctorProps } from './functor';
import { Queue } from './queue';
import { Resource } from './resource';
import { Sink, sink, SinkProps } from './sink';

declare module './functor' {
  interface IFunctor<E, T, D extends Dependencies, P extends FunctorProps> {
    toTopic(scope: cdk.Construct, id: string, streamProps: TopicProps<T>, props?: P): Topic<T>;
  }
  interface Functor<E, T, D extends Dependencies, P extends FunctorProps> extends IFunctor<E, T, D, P> {}
}
Functor.prototype.toTopic = function(scope: cdk.Construct, id: string, queueProps: TopicProps<any>, props: FunctorProps): Topic<any> {
  scope = new cdk.Construct(scope, id);
  const topic = new Topic(scope, 'Stream', queueProps);
  this.depends({topic}).forEach(scope, 'ForEach', async (value, {topic}) => {
    await topic.sink(value);
  });
  return topic;
};

// export interface ITopic<T, C extends Dependencies> extends Monad<SNSEvent, T, C, FunctorProps> {}

export type TopicProps<T> = {
  type: Type<T>;
} & sns.TopicProps;

export class Topic<T> extends sns.Topic implements Dependency<Topic.Client<T>> {
  public readonly context = {};
  public readonly type: Type<T>;
  public readonly mapper: Mapper<T, string>;

  constructor(scope: cdk.Construct, id: string, props: TopicProps<T>) {
    super(scope, id, props);
    this.type = props.type;
    this.mapper = Json.forType(props.type);
  }

  public eventSource() {
    return new events.SnsEventSource(this);
  }

  public stream<D extends Dependencies>(dependencies: D): ITopicStream<T[], D>;
  public stream(): ITopicStream<T, {}>;
  public stream(dependencies?: any) {
    return new TopicF(this as any, f => Promise.resolve(f), dependencies || {}, this);
  }

  public toQueue(scope: cdk.Construct, id: string): Queue<T> {
    const q = new Queue(scope, id, {
      type: this.type
    });
    this.subscribeQueue(q);
    return q;
  }

  public subscribeQueue(queue: Queue<T>): sns.Subscription {
    return super.subscribeQueue(queue, true);
  }

  public async *run(event: SNSEvent): AsyncIterableIterator<T> {
    for (const record of event.Records) {
      yield this.mapper.read(record.Sns.Message);
    }
  }

  public install(target: Runtime): void {
    this.grantPublish(target.grantable);
    target.properties.set('topicArn', this.topicArn);
  }

  public bootstrap(properties: PropertyBag, cache: Cache): Topic.Client<T> {
    return new Topic.Client(this.mapper, properties.get('topicArn'), cache.getOrCreate('aws:sns', () => new AWS.SNS()));
  }
}

export interface ITopicStream<T, D extends Dependencies> extends TopicF<T, D> {
  map<U>(f: (value: T, clients: Clients<D>) => Promise<U>): ITopicStream<U, D>;
}


class TopicF<T, D extends Dependencies> extends Functor<SNSEvent, T, D, FunctorProps>  {
  constructor(previous: TopicF<any, D>, f: (a: any, clients: Clients<D>) => Promise<T>, dependencies: D, private readonly topic: Topic<any>) {
    super(previous, f, dependencies);
  }

  public map<U>(f: (value: T, clients: Clients<D>) => Promise<U>): TopicF<U, D> {
    return new TopicF(this, f, this.dependencies, this.topic);
  }
}

export namespace Topic {
  export type PublishInput<T> = {Message: T} & Omit<AWS.SNS.PublishInput, 'Message' | 'TopicArn' | 'TargetArn' | 'PhoneNumber'>;
  export type PublishResponse = AWS.SNS.PublishResponse;
  export class Client<T> implements Sink<T> {
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

    public async sink(values: T[], props?: SinkProps): Promise<void> {
      await sink(values, async ([value]) => {
        try {
          await this.publish({
            Message: value
          });
          return [];
        } catch (err) {
          console.error(err);
          return [value];
        }
      }, props, 1);
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
