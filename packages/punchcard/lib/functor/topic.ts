import AWS = require('aws-sdk');

import cdk = require('@aws-cdk/cdk');

import events = require('@aws-cdk/aws-lambda-event-sources');
import sns = require('@aws-cdk/aws-sns');
import { Cache, Dependency, Depends, PropertyBag, Runtime } from '../compute';
import { Json, Mapper, Type } from '../shape';
import { Omit } from '../utils';
import { FunctorInput, Monad, MonadProps } from './functor';
import { Queue } from './queue';
import { Resource } from './resource';
import { Sink, sink, SinkProps } from './sink';

declare module './functor' {
  interface Monad<E, T, D extends Dependency<any>, P extends MonadProps> {
    toTopic(scope: cdk.Construct, id: string, streamProps: TopicProps<T>, props?: P): Topic<T>;
  }
}
Monad.prototype.toTopic = function(scope: cdk.Construct, id: string, queueProps: TopicProps<any>): Topic<any> {
  scope = new cdk.Construct(scope, id);
  const topic = new Topic(scope, 'Stream', queueProps);
  this.forBatch(scope, 'ForEach', {
    depends: topic,
    async handle(values, topic) {
      await topic.sink(values);
    }
  });
  return topic;
};

export type TopicProps<T> = {
  type: Type<T>;
} & sns.TopicProps;

export class Topic<T> implements Resource<sns.Topic>, Dependency<Topic.Client<T>> {
  public readonly context = {};
  public readonly type: Type<T>;
  public readonly mapper: Mapper<T, string>;
  public readonly resource: sns.Topic;

  constructor(scope: cdk.Construct, id: string, props: TopicProps<T>) {
    this.resource = new sns.Topic(scope, id, props);
    this.type = props.type;
    this.mapper = Json.forType(props.type);
  }

  public stream(): TopicStream<T, Depends.None> {
    return new TopicStream(this, this as any, {
      depends: Depends.none,
      handle: i => i
    });
  }

  public toQueue(scope: cdk.Construct, id: string): Queue<T> {
    const q = new Queue(scope, id, {
      type: this.type
    });
    this.subscribeQueue(q);
    return q;
  }

  public subscribeQueue(queue: Queue<T>): sns.Subscription {
    return this.resource.subscribeQueue(queue.resource, true);
  }

  public async *run(event: SNSEvent): AsyncIterableIterator<T> {
    for (const record of event.Records) {
      yield this.mapper.read(record.Sns.Message);
    }
  }

  public install(target: Runtime): void {
    this.resource.grantPublish(target.grantable);
    target.properties.set('topicArn', this.resource.topicArn);
  }

  public bootstrap(properties: PropertyBag, cache: Cache): Topic.Client<T> {
    return new Topic.Client(this.mapper, properties.get('topicArn'), cache.getOrCreate('aws:sns', () => new AWS.SNS()));
  }
}

export class TopicStream<T, D extends Dependency<any>> extends Monad<SNSEvent, T, D, MonadProps>  {
  constructor(public readonly topic: Topic<any>, previous: TopicStream<any, any>, input: FunctorInput<AsyncIterableIterator<any>, AsyncIterableIterator<T>, D>) {
    super(previous, input.handle, input.depends);
  }

  public eventSource() {
    return new events.SnsEventSource(this.topic.resource);
  }

  public chain<U, D2 extends Dependency<any>>(input: FunctorInput<AsyncIterableIterator<T>, AsyncIterableIterator<U>, Depends.Union<D2, D>>): TopicStream<U, Depends.Union<D2, D>> {
    return new TopicStream(this.topic, this, input);
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
