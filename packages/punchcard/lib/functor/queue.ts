import iam = require('@aws-cdk/aws-iam');
import events = require('@aws-cdk/aws-lambda-event-sources');
import sqs = require('@aws-cdk/aws-sqs');
import cdk = require('@aws-cdk/cdk');
import AWS = require('aws-sdk');

import { Cache, PropertyBag } from '../compute/property-bag';
import { Json, Mapper, Type } from '../shape';
import { Omit } from '../utils';
import { MonadProps, Monad, FunctorInput } from './functor';
import { Resource } from './resource';
import { sink, Sink, SinkProps } from './sink';
import { Dependency, Runtime, Depends } from '../compute';

// declare module './functor' {
//   interface Monad<E, T, D extends Dependencies, P extends MonadProps> {
//     toQueue(scope: cdk.Construct, id: string, queueProps: QueueProps<T>, props?: P): Queue<T>;
//   }
// }
// Monad.prototype.toQueue = function(scope: cdk.Construct, id: string, queueProps: QueueProps<any>, props: MonadProps): Queue<any> {
//   scope = new cdk.Construct(scope, id);
//   const queue = new Queue(scope, 'Stream', queueProps);
//   this.toSink(scope, 'Sink', queue, props);
//   return queue;
// };

export type QueueMonadProps = MonadProps & events.SqsEventSourceProps;

/**
 * Props for constructing a Queue.
 *
 * It extends the standard `sqs.QueueProps` with a `mapper` instance.
 */
export interface QueueProps<T> extends sqs.QueueProps {
  type: Type<T>;
}
/**
 * Represents a SQS Queue containtining messages of type, `T`, serialized with some `Codec`.
 */
export class Queue<T> implements Resource<sqs.Queue>, Dependency<Queue.ConsumeAndSendClient<T>> {
  public readonly context = {};
  public readonly mapper: Mapper<T, string>;
  public readonly resource: sqs.Queue;

  constructor(scope: cdk.Construct, id: string, props: QueueProps<T>) {
    this.resource = new sqs.Queue(scope, id, props);
    this.mapper = Json.forType(props.type);
  }

  public stream(): QueueMonad<T, Depends.None> {
    return new QueueMonad(this, this as any, {
      depends: Depends.none,
      handle: i => i
    });
  }

  /**
   * Bottom of the recursive async generator - returns the records
   * parsed and validated out of the SQSEvent.
   *
   * @param event payload of SQS event
   */
  public async *run(event: SQSEvent): AsyncIterableIterator<T> {
    console.log('queue.run');
    for (const record of event.Records.map(record => this.mapper.read(record.body))) {
      yield record;
    }
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
  public consumeAndSendClient(): Dependency<Queue.ConsumeAndSendClient<T>> {
    return this._client(g => {
      this.resource.grantConsumeMessages(g);
      this.resource.grantSendMessages(g);
    });
  }

  /**
   * A client with only permission to consume messages from this Queue.
   */
  public consumeClient(): Dependency<Queue.ConsumeClient<T>> {
    return this._client(g => this.resource.grantConsumeMessages(g));
  }

  /**
   * A client with only permission to send messages to this Queue.
   */
  public sendClient(): Dependency<Queue.SendClient<T>> {
    return this._client(g => this.resource.grantSendMessages(g));
  }

  private _client(grant: (grantable: iam.IGrantable) => void): Dependency<Queue.Client<T>> {
    return {
      install: (target: Runtime) => {
        target.properties.set('queueUrl', this.resource.queueUrl);
        grant(target.grantable);
      },
      bootstrap: this.bootstrap.bind(this),
    };
  }
}

class QueueMonad<T, D extends Dependency<any>> extends Monad<SQSEvent, T, D, MonadProps>  {
  constructor(public readonly queue: Queue<any>, previous: QueueMonad<any, any>, input: FunctorInput<AsyncIterableIterator<any>, AsyncIterableIterator<T>, D>) {
    super(previous, input.handle, input.depends);
  }

  public eventSource(props?: QueueMonadProps) {
    return new events.SqsEventSource(this.queue.resource, props);
  }

  public chain<U, D2 extends Dependency<any>>(input: FunctorInput<AsyncIterableIterator<T>, AsyncIterableIterator<U>, Depends.Union<D2, D>>): QueueMonad<U, Depends.Union<D2, D>> {
    return new QueueMonad(this.queue, this, input);
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
  export class Client<T> implements Sink<T> {
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

    public async sink(records: T[], props?: SinkProps): Promise<void> {
      return sink(records, async values => {
        const batch = values.map((value, i) => ({
          Id: i.toString(10),
          MessageBody: value,
        }));
        const result = await this.sendMessageBatch(batch);

        if (result.Failed) {
          return result.Failed
            .map(r => parseInt(r.Id, 10))
            .map(i => values[i]);
        }
        return [];
      }, props, 10);
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
