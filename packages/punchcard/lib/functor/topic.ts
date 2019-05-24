import AWS = require('aws-sdk');

import cdk = require('@aws-cdk/cdk');

import { StreamEncryption } from '@aws-cdk/aws-kinesis';
import lambda = require('@aws-cdk/aws-lambda');
import events = require('@aws-cdk/aws-lambda-event-sources');
import sns = require('@aws-cdk/aws-sns');
import { Cache, PropertyBag } from '../property-bag';
import { Client, ClientContext, Clients, Runtime } from '../runtime';
import { BufferMapper, Json, Mapper, Type } from '../shape';
import { Omit } from '../utils';
import { Functor, FunctorProps } from './functor';
import { Queue } from './queue';
import { ISource } from './source';
import { Stream } from './stream';

export interface ITopic<T, C extends ClientContext> extends ISource<SNSEvent, T, C, FunctorProps> {}

export type TopicProps<T> = {
  type: Type<T>;
} & sns.TopicProps;

export class Topic<T> extends sns.Topic implements Client<Topic.Client<T>>, ITopic<T, {}> {
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
    }).forBatch(scope, 'Forward', async (values, {stream}) => {
      return await stream.putAll(values);
    }, props);
    return stream;
  }

  public subscribeQueue(queue: Queue<T>): sns.Subscription {
    return super.subscribeQueue(queue, true);
  }

  public async *run(event: SNSEvent): AsyncIterableIterator<T[]> {
    return yield event.Records.map(record => {
      return this.mapper.read(record.Sns.Message);
    });
  }

  public map<U>(f: (value: T, clients: Clients<{}>) => Promise<U>): TopicFunctor<U, {}> {
    return this.lift().map(f);
  }

  public forBatch(scope: cdk.Construct, id: string, f: (values: T[], clients: Clients<{}>) => Promise<any>, props?: FunctorProps): lambda.Function {
    return this.lift().forBatch(scope, id, f, props);
  }

  public forEach(scope: cdk.Construct, id: string, f: (value: T, clients: Clients<{}>) => Promise<any>, props?: FunctorProps): lambda.Function {
    return this.lift().forEach(scope, id, f, props);
  }

  public clients<C extends ClientContext>(context: C): TopicFunctor<T, C> {
    return this.lift().clients(context);
  }

  public lift(): TopicFunctor<T, {}> {
    return new TopicFunctor(this, {});
  }

  public install(target: Runtime): void {
    this.grantPublish(target.grantable);
    target.properties.set('topicArn', this.topicArn);
  }

  public bootstrap(properties: PropertyBag, cache: Cache): Topic.Client<T> {
    return new Topic.Client(this.mapper, properties.get('topicArn'), cache.getOrCreate('aws:sns', () => new AWS.SNS()));
  }
}

class TopicFunctor<T, C extends ClientContext> extends Functor<SNSEvent, T, C, FunctorProps> {
  constructor(private readonly topic: Topic<T>, context: C) {
    super(context);
  }

  public async *run(event: SNSEvent): AsyncIterableIterator<T[]> {
    return yield event.Records.map(record => this.topic.mapper.read(record.Sns.Message));
  }

  public eventSource() {
    return new events.SnsEventSource(this.topic);
  }
}
interface TopicFunctor<T, C extends ClientContext> {
  map<U>(f: (value: T, clients: Clients<C>) => Promise<U>): TopicFunctor<U, C>;
  clients<C2 extends ClientContext>(clients: C2): TopicFunctor<T, C & C2>;
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