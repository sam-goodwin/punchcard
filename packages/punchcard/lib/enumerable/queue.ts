import iam = require('@aws-cdk/aws-iam');
import lambda = require('@aws-cdk/aws-lambda');
import events = require('@aws-cdk/aws-lambda-event-sources');
import sqs = require('@aws-cdk/aws-sqs');
import cdk = require('@aws-cdk/cdk');
import AWS = require('aws-sdk');

import { LambdaExecutorService } from '../compute';
import { Cache, PropertyBag } from '../property-bag';
import { Client, ClientContext, Clients, Runtime } from '../runtime';
import { BufferMapper, Mapper } from '../shape';
import { Omit } from '../utils';
import { EnumerateProps, IEnumerable } from './enumerable';
import { Stream } from './stream';

export type EnumerateQueueProps = EnumerateProps & events.SqsEventSourceProps;
export interface IQueue<T, C extends ClientContext> extends IEnumerable<T, C, EnumerateQueueProps> {
  run(event: SQSEvent, clients: Clients<C>): AsyncIterableIterator<T[]>;
  map<U>(f: (value: T, clients: Clients<C>) => Promise<U>): IQueue<U, C>;
}

export interface QueueProps<T> extends sqs.QueueProps {
  mapper: Mapper<T, string>;
}
export class Queue<T> extends sqs.Queue implements Client<Queue.Client<T>>, IEnumerable<T, {}, EnumerateQueueProps> {
  public readonly context = {};
  public readonly mapper: Mapper<T, string>;

  constructor(scope: cdk.Construct, id: string, props: QueueProps<T>) {
    super(scope, id, props);
    this.mapper = props.mapper;
  }

  public async *run(event: SQSEvent): AsyncIterableIterator<T[]> {
    return yield event.Records.map(record => this.mapper.read(record.body));
  }

  public map<U>(f: (value: T, clients: Clients<{}>) => Promise<U>): IQueue<U, {}> {
    return new ContextualizedQueue(this, this, this.context,
      (values, clients) => Promise.all(values.map(v => f(v, clients))));
  }

  public toStream(scope: cdk.Construct, id: string, props?: EnumerateQueueProps): Stream<T> {
    scope = new cdk.Construct(scope, id);
    const mapper = BufferMapper.wrap(this.mapper);
    const stream = new Stream(scope, 'Stream', {
      mapper
    });
    this.clients({
      stream
    }).forBatch(scope, 'ForwardToStream', async (values, {stream}) => {
      await stream.putAll(values);
    }, props);
    return stream;
  }

  public forBatch(scope: cdk.Construct, id: string, f: (values: T[], clients: Clients<{}>) => Promise<any>, props?: EnumerateQueueProps): lambda.Function {
    return new ContextualizedQueue<T, T, {}>(this, this, this.context, v => Promise.resolve(v)).forBatch(scope, id, f, props);
  }

  public forEach(scope: cdk.Construct, id: string, f: (value: T, clients: Clients<{}>) => Promise<any>, props?: EnumerateQueueProps): lambda.Function {
    return new ContextualizedQueue<T, T, {}>(this, this, this.context, v => Promise.resolve(v)).forEach(scope, id, f, props);
  }

  public clients<C2 extends ClientContext>(context: C2): IQueue<T, C2> {
    return new ContextualizedQueue<T, T, C2>(this, this as any, {
      ...this.context,
      ...context
    }, v => Promise.resolve(v));
  }

  public bootstrap(properties: PropertyBag, cache: Cache): Queue.Client<T> {
    return new Queue.Client(
      properties.get('queueUrl'),
      cache.getOrCreate('aws:sqs', () => new AWS.SQS()),
      this.mapper);
  }

  public install(target: Runtime): void {
    this.readWrite().install(target);
  }

  public readWrite(): Client<Queue.Client<T>> {
    return this._client(g => {
      this.grantConsumeMessages(g);
      this.grantSendMessages(g);
    });
  }

  public read(): Client<Omit<Queue.Client<T>, 'sendMessage' | 'sendMessageBatch'>> {
    return this._client(this.grantConsumeMessages.bind(this));
  }

  public write(): Client<Omit<Queue.Client<T>, 'receiveMessage'>> {
    return this._client(this.grantSendMessages.bind(this));
  }

  private _client(grant: (grantable: iam.IGrantable) => void): Client<Queue.Client<T>> {
    return {
      install: target => {
        target.properties.set('queueUrl', this.queueUrl);
        grant(target.grantable);
      },
      bootstrap: this.bootstrap.bind(this),
    };
  }
}

export class ContextualizedQueue<T, U, C extends ClientContext> implements IEnumerable<U, C, EnumerateQueueProps> {
  constructor(
    private readonly queue: Queue<any>,
    private readonly parent: IQueue<T, C>,
    public readonly context: C,
    private readonly f: (values: T[], clients: Clients<C>) => Promise<U[]>) {}

  public async *run(event: SQSEvent, clients: Clients<C>): AsyncIterableIterator<U[]> {
    for await (const batch of this.parent.run(event, clients)) {
      yield await this.f(batch, clients);
    }
  }

  public map<V>(f: (value: U, clients: Clients<C>) => Promise<V>): IQueue<V, C> {
    return new ContextualizedQueue(this.queue, this, this.context,
      (values, clients) => Promise.all(values.map(v => f(v, clients))));
  }

  public forBatch(scope: cdk.Construct, id: string, f: (values: U[], clients: Clients<C>) => Promise<any>, props?: EnumerateQueueProps): lambda.Function {
    props = props || {};
    const executorService = props.executorService || new LambdaExecutorService({
      memorySize: 128
    });
    const lambdaFn = executorService.spawn(scope, id, {
      clients: this.context,
      handle: async (event: SQSEvent, clients: Clients<C>) => {
        for await (const batch of this.run(event, clients)) {
          await f(batch, clients);
        }
      }
    });
    lambdaFn.addEventSource(new events.SqsEventSource(this.queue, props));
    return lambdaFn;
  }

  public forEach(scope: cdk.Construct, id: string, f: (value: U, clients: Clients<C>) => Promise<any>, props?: EnumerateQueueProps): lambda.Function {
    return this.forBatch(scope, id, (values, clients) => Promise.all(values.map(v => f(v, clients))), props);
  }

  public clients<C2 extends ClientContext>(context: C2): IQueue<U, C & C2> {
    return new ContextualizedQueue(this.queue, this.parent as any, {
      ...this.context,
      ...context
    }, this.f);
  }
}

export namespace Queue {
  export type ReceiveMessageRequest = Omit<AWS.SQS.ReceiveMessageRequest, 'QueueUrl'>;
  export type ReceiveMessageResult<T> = Array<{Body: T} & Omit<AWS.SQS.Message, 'Body'>>;
  export type SendMessageRequest<T> = {MessageBody: T} & Omit<AWS.SQS.SendMessageRequest, 'QueueUrl' | 'MessageBody'>;
  export type SendMessageResult = AWS.SQS.SendMessageResult;
  export type SendMessageBatchRequest<T> = Array<{MessageBody: T} & Omit<AWS.SQS.SendMessageBatchRequestEntry, 'MessageBody'>>;
  export type SendMessageBatchResult = AWS.SQS.SendMessageBatchResult;

  export class Client<T> {
    constructor(
      public readonly queueUrl: string,
      public readonly client: AWS.SQS,
      public readonly mapper: Mapper<T, string>
    ) {}

    public async receiveMessage(request?: ReceiveMessageRequest): Promise<ReceiveMessageResult<T>> {
      const response = await this.client.receiveMessage({
        ...(request || {}),
        QueueUrl: this.queueUrl
      }).promise();
      return (response.Messages || []).map(message => ({
        ...message,
        Body: this.mapper.read(message.Body!)
      }));
    }

    public sendMessage(request: SendMessageRequest<T>): Promise<SendMessageResult> {
      return this.client.sendMessage({
        QueueUrl: this.queueUrl,
        ...request,
        MessageBody: this.mapper.write(request.MessageBody)
      }).promise();
    }

    public sendMessageBatch(request: SendMessageBatchRequest<T>): Promise<AWS.SQS.SendMessageBatchResult> {
      return this.client.sendMessageBatch({
        QueueUrl: this.queueUrl,
        Entries: request.map(record => ({
          ...record,
          MessageBody: this.mapper.write(record.MessageBody)
        }))
      }).promise();
    }
  }
}

/**
 * Shape of event sent to Lambda when subscribed to a SQS Queue.
 *
 * @see https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
 */
export interface SQSEvent {
  Records: Array<{
    messageId: string;
    receiptHandle: string;
    body: string;
    attributes: {[key: string]: string};
    messageAttributes: {[key: string]: string};
    md5OfBody: string;
    eventSource: string;
    eventSourceARN: string;
    awsRegion: string;
  }>;
}
