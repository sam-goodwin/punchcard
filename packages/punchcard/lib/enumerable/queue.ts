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
  /**
   * Asynchronously processes a `SQSEvent` and yields values.
   *
   * @param event sqs event payload
   * @param clients bootstrapped clients
   */
  run(event: SQSEvent, clients: Clients<C>): AsyncIterableIterator<T[]>;
  /**
   * Describe a transformation of a queue's messages.
   *
   * **Warning**: the transformation in a map only runs when terminated, i.e. it is
   * lazily evaluated, so you must call `forEach` or `forBatch`.
   *
   * @param f transformation function
   */
  map<U>(f: (value: T, clients: Clients<C>) => Promise<U>): IQueue<U, C>;
}

/**
 * Props for constructing a Queue.
 *
 * It extends the standard `sqs.QueueProps` with a `mapper` instance.
 */
export interface QueueProps<T> extends sqs.QueueProps {
  mapper: Mapper<T, string>;
}
/**
 * Represents a SQS Queue containtining messages of type, `T`, serialized with some `Codec`.
 */
export class Queue<T> extends sqs.Queue implements IQueue<T, {}>, Client<Queue.ConsumeAndSendClient<T>> {
  public readonly context = {};
  public readonly mapper: Mapper<T, string>;

  constructor(scope: cdk.Construct, id: string, props: QueueProps<T>) {
    super(scope, id, props);
    this.mapper = props.mapper;
  }

  /**
   * Bottom of the recursive async generator - returns the records
   * parsed and validated out of the SQSEvent.
   *
   * @param event payload of SQS event
   */
  public async *run(event: SQSEvent): AsyncIterableIterator<T[]> {
    return yield event.Records.map(record => this.mapper.read(record.body));
  }

  /**
   * Transform each value.
   *
   * @param f which transforms a record
   */
  public map<U>(f: (value: T, clients: Clients<{}>) => Promise<U>): IQueue<U, {}> {
    return new QueueMap(this, this, this.context,
      (values, clients) => Promise.all(values.map(v => f(v, clients))));
  }

  /**
   * Create and send this queue's data to a Kinesis Stream.
   *
   * @param scope under which this construct should be created
   * @param id of the construct
   * @param props optional enumerate queue props
   */
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

  /**
   * Enumerate queue messages by processing batches (of up to 10) messges.
   *
   * `forBatch` will subscribe a Lambda Function to the SQS Queue.
   *
   * @param scope under which this construct should be created
   * @param id of the construct
   * @param f next transformation of a batch of records
   * @param props optional props for configuring the function consuming from SQS
   */
  public forBatch(scope: cdk.Construct, id: string, f: (values: T[], clients: Clients<{}>) => Promise<any>, props?: EnumerateQueueProps): lambda.Function {
    return new QueueMap<T, T, {}>(this, this, this.context, v => Promise.resolve(v)).forBatch(scope, id, f, props);
  }

  public forEach(scope: cdk.Construct, id: string, f: (value: T, clients: Clients<{}>) => Promise<any>, props?: EnumerateQueueProps): lambda.Function {
    return new QueueMap<T, T, {}>(this, this, this.context, v => Promise.resolve(v)).forEach(scope, id, f, props);
  }

  /**
   * Add another client to the client context.
   * @param context new client context
   */
  public clients<C2 extends ClientContext>(context: C2): IQueue<T, C2> {
    return new QueueMap<T, T, C2>(this, this as any, {
      ...this.context,
      ...context
    }, v => Promise.resolve(v));
  }

  /**
   * Get the `queueUrl` from properties and create a SQS client for this queue's data type.
   *
   * @param properties runtime property bag
   * @param cache of shared runtime state
   */
  public bootstrap(properties: PropertyBag, cache: Cache): Queue.Client<T> {
    return new Queue.Client(
      properties.get('queueUrl'),
      cache.getOrCreate('aws:sqs', () => new AWS.SQS()),
      this.mapper);
  }

  /**
   * By default, the consume and send client is installed for a Queue.
   */
  public install(target: Runtime): void {
    this.consumeAndSendClient().install(target);
  }

  /**
   * A client with permission to consume and send messages.
   */
  public consumeAndSendClient(): Client<Queue.ConsumeAndSendClient<T>> {
    return this._client(g => {
      this.grantConsumeMessages(g);
      this.grantSendMessages(g);
    });
  }

  /**
   * A client with only permission to consume messages from this Queue.
   */
  public consumeClient(): Client<Queue.ConsumeClient<T>> {
    return this._client(this.grantConsumeMessages.bind(this));
  }

  /**
   * A client with only permission to send messages to this Queue.
   */
  public sendClient(): Client<Queue.SendClient<T>> {
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

/**
 * Describes a transformation of messages in a Queue.
 *
 * **Warning**: A transformation will only be evaluated if a terminal, such
 * as `forEach` or `forBatch`, is called.
 */
class QueueMap<T, U, C extends ClientContext> implements IQueue<U, C> {
  constructor(
    private readonly queue: Queue<any>,
    private readonly parent: IQueue<T, C>,
    public readonly context: C,
    private readonly f: (values: T[], clients: Clients<C>) => Promise<U[]>) {}

  /**
   * Proceses each batch from the parent queue and applies this stage's transformation.
   * @param event SQS event
   * @param clients bootstrapped clients
   */
  public async *run(event: SQSEvent, clients: Clients<C>): AsyncIterableIterator<U[]> {
    for await (const batch of this.parent.run(event, clients)) {
      yield await this.f(batch, clients);
    }
  }

  /**
   * Transform each value.
   *
   * @param f which transforms a record
   */
  public map<V>(f: (value: U, clients: Clients<C>) => Promise<V>): IQueue<V, C> {
    return new QueueMap(this.queue, this, this.context,
      (values, clients) => Promise.all(values.map(v => f(v, clients))));
  }

  /**
   * Enumerate bathches of messages yielded by this transformation.
   *
   * `forBatch` will subscribe a Lambda Function to the SQS Queue.
   *
   * @param scope under which this construct should be created
   * @param id of the construct
   * @param f next transformation of a batch of records
   * @param props optional props for configuring the function consuming from SQS
   */
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

  /**
   * Enumearte each record yielded by a transformation of messages in this queue.
   *
   * `forEach` will subscribe a Lambda Function to the SQS Queue.
   *
   * If you want to use batch APIs, e.g. for putting to a kinesis stream, then use
   * `forBatch` instead.
   *
   * @param scope under which this construct should be created
   * @param id of the construct
   * @param f next transformation of a record
   * @param props optional props for configuring the function consuming from SQS
   */
  public forEach(scope: cdk.Construct, id: string, f: (value: U, clients: Clients<C>) => Promise<any>, props?: EnumerateQueueProps): lambda.Function {
    return this.forBatch(scope, id, (values, clients) => Promise.all(values.map(v => f(v, clients))), props);
  }

  /**
   * Add more clients to the client context.
   * @param context new client context
   */
  public clients<C2 extends ClientContext>(context: C2): IQueue<U, C & C2> {
    return new QueueMap(this.queue, this.parent as any, {
      ...this.context,
      ...context
    }, this.f);
  }
}

/**
 * Namespace for `Queue` type aliases and its `Client` implementation.
 */
export namespace Queue {
  export type ConsumeAndSendClient<T> = Client<T>;
  export type ConsumeClient<T> = Omit<Client<T>, 'sendMessage' | 'sendMessageBatch'>;
  export type SendClient<T> = Omit<Client<T>, 'receiveMessage'>;

  export type ReceiveMessageRequest = Omit<AWS.SQS.ReceiveMessageRequest, 'QueueUrl'>;
  export type ReceiveMessageResult<T> = Array<{Body: T} & Omit<AWS.SQS.Message, 'Body'>>;
  export type SendMessageRequest<T> = {MessageBody: T} & Omit<AWS.SQS.SendMessageRequest, 'QueueUrl' | 'MessageBody'>;
  export type SendMessageResult = AWS.SQS.SendMessageResult;
  export type SendMessageBatchRequest<T> = Array<{MessageBody: T} & Omit<AWS.SQS.SendMessageBatchRequestEntry, 'MessageBody'>>;
  export type SendMessageBatchResult = AWS.SQS.SendMessageBatchResult;

  /**
   * Runtime representation of a SQS Queue.
   */
  export class Client<T> {
    constructor(
      public readonly queueUrl: string,
      public readonly client: AWS.SQS,
      public readonly mapper: Mapper<T, string>
    ) {}

    /**
     * Retrieves one or more messages (up to 10), from the specified queue.
     */
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

    /**
     * Delivers a message to the specified queue.
     */
    public sendMessage(request: SendMessageRequest<T>): Promise<SendMessageResult> {
      return this.client.sendMessage({
        QueueUrl: this.queueUrl,
        ...request,
        MessageBody: this.mapper.write(request.MessageBody)
      }).promise();
    }

    /**
     * Delivers a batch of messages to the specified queue.
     */
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
