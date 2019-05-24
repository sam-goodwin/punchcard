import AWS = require('aws-sdk');

import cdk = require('@aws-cdk/cdk');

import { StreamEncryption } from '@aws-cdk/aws-kinesis';
import events = require('@aws-cdk/aws-lambda-event-sources');
import sns = require('@aws-cdk/aws-sns');
import { Cache, PropertyBag } from '../property-bag';
import { Client, ClientContext, Clients, Runtime } from '../runtime';
import { BufferMapper, Json, Mapper, Type } from '../shape';
import { Omit } from '../utils';
import { Chain, FunctorProps, Monad } from './functor';
import { Queue } from './queue';
import { Resource } from './resource';
import { Stream } from './stream';

export interface ITopic<T, C extends ClientContext> extends Monad<SNSEvent, T, C, FunctorProps> {}

export type TopicProps<T> = {
  type: Type<T>;
} & sns.TopicProps;

export class Topic<T> extends Monad<SNSEvent, T, {}, FunctorProps> implements Client<Topic.Client<T>>, ITopic<T, {}>, Resource<sns.Topic> {
  public readonly context = {};
  public readonly type: Type<T>;
  public readonly mapper: Mapper<T, string>;
  public readonly resource: sns.Topic;

  constructor(scope: cdk.Construct, id: string, props: TopicProps<T>) {
    super({});
    this.resource = new sns.Topic(scope, id);
    this.type = props.type;
    this.mapper = Json.forType(props.type);
  }

  public eventSource() {
    return new events.SnsEventSource(this.resource);
  }

  public chain<U, C2 extends ClientContext>(context: C2, f: (value: T, clients: Clients<{}>) => Promise<U[]>): ITopic<U, C2> {
    return new TopicChain(context, this as any, f);
  }

  public toQueue(scope: cdk.Construct, id: string): Queue<T> {
    const q = new Queue(scope, id, {
      mapper: this.mapper
    });
    this.subscribeQueue(q);
    return q;
  }

  public toStream(scope: cdk.Construct, id: string, props?: FunctorProps): Stream<T> {
    scope = new cdk.Construct(scope, id);
    const mapper = BufferMapper.wrap(this.mapper);
    const stream = new Stream(scope, 'Stream', {
      mapper,
      encryption: StreamEncryption.Kms
    });
    this.clients({
      stream
    }).forEach(scope, 'Forward', async (value, {stream}) => {
      return await stream.putAll([value]);
    }, props);
    return stream;
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

class TopicChain<T, U, C extends ClientContext> extends Chain<SNSEvent, T, U, C, FunctorProps> implements ITopic<U, C> {
  public chain<V, C2 extends ClientContext>(context: C2, f: (value: U, clients: Clients<C>) => Promise<V[]>): TopicChain<U, V, C & C2> {
    return new TopicChain({...context, ...this.context}, this as any, f);
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