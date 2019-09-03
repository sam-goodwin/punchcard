import iam = require('@aws-cdk/aws-iam');
import sqs = require('@aws-cdk/aws-sqs');
import core = require('@aws-cdk/core');
import AWS = require('aws-sdk');

import { Namespace } from '../core/assembly';
import { Cache } from '../core/cache';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Json, Mapper, RuntimeShape, Shape } from '../shape';
import { Omit } from '../util/omit';
import { sink, Sink, SinkProps } from '../util/sink';
import { Event } from './event';
import { Messages } from './messages';

/**
 * Props for constructing a Queue.
 *
 * It extends the standard `sqs.QueueProps` with a `mapper` instance.
 */
export interface QueueProps<T extends Shape<any>> extends sqs.QueueProps {
  /**
   * Shape of data in the SQS Queue.
   */
  shape: T;
}
/**
 * Represents a SQS Queue containtining messages of type, `T`, serialized with some `Codec`.
 */
export class Queue<T extends Shape<any>> implements Resource<sqs.Queue>, Dependency<Queue.ConsumeAndSendClient<T>> {
  public readonly context = {};
  public readonly mapper: Mapper<RuntimeShape<T>, string>;
  public readonly resource: sqs.Queue;

  constructor(scope: core.Construct, id: string, props: QueueProps<T>) {
    this.resource = new sqs.Queue(scope, id, props);
    this.mapper = Json.forShape(props.shape);
  }

  /**
   * Get a Lazy `Stream` of notifications Queue's messages.
   *
   * Warning: do not consume from the Queue twice - it does not have fan-out.
   */
  public messages(): Messages<RuntimeShape<T>, []> {
    const mapper = this.mapper;
    class Root extends Messages<RuntimeShape<T>, []> {
      /**
       * Bottom of the recursive async generator - returns the records
       * parsed and validated out of the SQSEvent.
       *
       * @param event payload of SQS event
       */
      public async *run(event: Event) {
        for (const record of event.Records.map(record => mapper.read(record.body))) {
          yield record;
        }
      }
    }
    return new Root(this, undefined as any, {
      depends: [],
      handle: i => i
    });
  }

  /**
   * Get the `queueUrl` from properties and create a SQS client for this queue's data type.
   *
   * @param namespace runtime property bag
   * @param cache of shared runtime state
   */
  public async bootstrap(namespace: Namespace, cache: Cache): Promise<Queue.Client<T>> {
    return new Queue.Client(
      namespace.get('queueUrl'),
      cache.getOrCreate('aws:sqs', () => new AWS.SQS()),
      this.mapper);
  }

  /**
   * By default, the consume and send client is installed for a Queue.
   */
  public install(namespace: Namespace, grantable: iam.IGrantable): void {
    this.consumeAndSendAccess().install(namespace, grantable);
  }

  /**
   * A client with permission to consume and send messages.
   */
  public consumeAndSendAccess(): Dependency<Queue.ConsumeAndSendClient<T>> {
    return this._client(g => {
      this.resource.grantConsumeMessages(g);
      this.resource.grantSendMessages(g);
    });
  }

  /**
   * A client with only permission to consume messages from this Queue.
   */
  public consumeAccess(): Dependency<Queue.ConsumeClient<T>> {
    return this._client(g => this.resource.grantConsumeMessages(g));
  }

  /**
   * A client with only permission to send messages to this Queue.
   */
  public sendAccess(): Dependency<Queue.SendClient<T>> {
    return this._client(g => this.resource.grantSendMessages(g));
  }

  private _client(grant: (grantable: iam.IGrantable) => void): Dependency<Queue.Client<T>> {
    return {
      install: (namespace, grantable) => {
        namespace.set('queueUrl', this.resource.queueUrl);
        grant(grantable);
      },
      bootstrap: this.bootstrap.bind(this),
    };
  }
}

/**
 * Namespace for `Queue` type aliases and its `Client` implementation.
 */
export namespace Queue {
  export type ConsumeAndSendClient<T extends Shape<any>> = Client<T>;
  export type ConsumeClient<T extends Shape<any>> = Omit<Client<T>, 'sendMessage' | 'sendMessageBatch'>;
  export type SendClient<T extends Shape<any>> = Omit<Client<T>, 'receiveMessage'>;

  export type ReceiveMessageRequest = Omit<AWS.SQS.ReceiveMessageRequest, 'QueueUrl'>;
  export type ReceiveMessageResult<T extends Shape<any>> = Array<{Body: RuntimeShape<T>} & Omit<AWS.SQS.Message, 'Body'>>;
  export type SendMessageRequest<T extends Shape<any>> = {MessageBody: RuntimeShape<T>} & Omit<AWS.SQS.SendMessageRequest, 'QueueUrl' | 'MessageBody'>;
  export type SendMessageResult = AWS.SQS.SendMessageResult;
  export type SendMessageBatchRequest<T extends Shape<any>> = Array<{MessageBody: RuntimeShape<T>} & Omit<AWS.SQS.SendMessageBatchRequestEntry, 'MessageBody'>>;
  export type SendMessageBatchResult = AWS.SQS.SendMessageBatchResult;

  /**
   * Runtime representation of a SQS Queue.
   */
  export class Client<T extends Shape<any>> implements Sink<RuntimeShape<T>> {
    constructor(
      public readonly queueUrl: string,
      public readonly client: AWS.SQS,
      public readonly mapper: Mapper<RuntimeShape<T>, string>
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

    public async sink(records: Array<RuntimeShape<T>>, props?: SinkProps): Promise<void> {
      return sink(records, async values => {
        const batch = values.map((value, i) => ({
          Id: i.toString(10),
          MessageBody: value,
        }));
        const result = await this.sendMessageBatch(batch);

        if (result.Failed) {
          return result.Failed.map(r => values[parseInt(r.Id, 10)]);
        }
        return [];
      }, props, 10);
    }
  }
}
