import iam = require('@aws-cdk/aws-iam');
import events = require('@aws-cdk/aws-lambda-event-sources');
import sqs = require('@aws-cdk/aws-sqs');
import cdk = require('@aws-cdk/cdk');
import AWS = require('aws-sdk');

import { Cache, PropertyBag } from '../property-bag';
import { Client, ClientContext, Clients, Runtime } from '../runtime';
import { BufferMapper, Mapper } from '../shape';
import { Omit } from '../utils';
import { Chain, FunctorProps, Monad } from './functor';
import { Resource } from './resource';
import { Stream } from './stream';

export type QueueFunctorProps = FunctorProps & events.SqsEventSourceProps;

export interface IQueue<T, C extends ClientContext> extends Monad<SQSEvent, T, C, QueueFunctorProps> {
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
export class Queue<T> extends Monad<SQSEvent, T[], {}, QueueFunctorProps> implements IQueue<T[], {}>, Client<Queue.ConsumeAndSendClient<T>>, Resource<sqs.Queue> {
  public readonly context = {};
  public readonly mapper: Mapper<T, string>;
  public readonly resource: sqs.Queue;

  constructor(scope: cdk.Construct, id: string, props: QueueProps<T>) {
    super({});
    this.resource = new sqs.Queue(scope, id, props);
    this.mapper = props.mapper;
  }

  public eventSource(props?: QueueFunctorProps) {
    return new events.SqsEventSource(this.resource, props);
  }

  public chain<U, C2 extends ClientContext>(context: C2, f: (value: T[], clients: Clients<{}>) => Promise<U[]>): IQueue<U, C2> {
    return new QueueChain<T[], U, C2>(context, this as any, f);
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
   * Create and send this queue's data to a Kinesis Stream.
   *
   * @param scope under which this construct should be created
   * @param id of the construct
   * @param props optional enumerate queue props
   */
  public toStream(scope: cdk.Construct, id: string, props?: QueueFunctorProps): Stream<T> {
    scope = new cdk.Construct(scope, id);
    const mapper = BufferMapper.wrap(this.mapper);
    const stream = new Stream(scope, 'Stream', {
      mapper
    });
    this.clients({
      stream
    }).forEach(scope, 'ForwardToStream', async (values, {stream}) => {
      await stream.putAll(values);
    }, props);
    return stream;
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
      this.resource.grantConsumeMessages(g);
      this.resource.grantSendMessages(g);
    });
  }

  /**
   * A client with only permission to consume messages from this Queue.
   */
  public consumeClient(): Client<Queue.ConsumeClient<T>> {
    return this._client(g => this.resource.grantConsumeMessages(g));
  }

  /**
   * A client with only permission to send messages to this Queue.
   */
  public sendClient(): Client<Queue.SendClient<T>> {
    return this._client(g => this.resource.grantSendMessages(g));
  }

  private _client(grant: (grantable: iam.IGrantable) => void): Client<Queue.Client<T>> {
    return {
      install: target => {
        target.properties.set('queueUrl', this.resource.queueUrl);
        grant(target.grantable);
      },
      bootstrap: this.bootstrap.bind(this),
    };
  }
}

class QueueChain<T, U, C extends ClientContext> extends Chain<SQSEvent, T, U, C, QueueFunctorProps> {
  public chain<V, C2 extends ClientContext>(context: C2, f: (value: U, clients: Clients<C>) => Promise<V[]>): QueueChain<U, V, C & C2> {
    return new QueueChain({...context, ...this.context}, this as any, f);
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
