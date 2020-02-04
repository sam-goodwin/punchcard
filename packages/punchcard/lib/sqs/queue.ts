import iam = require('@aws-cdk/aws-iam');
import sqs = require('@aws-cdk/aws-sqs');
import core = require('@aws-cdk/core');
import AWS = require('aws-sdk');

import { any, AnyShape, Mapper, MapperFactory, ShapeOrRecord, Value } from '@punchcard/shape';
import json = require('@punchcard/shape-json');
import { Build } from '../core/build';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import { sink, Sink, SinkProps } from '../util/sink';
import { Event } from './event';
import { Messages } from './messages';

export interface QueueProps<T extends ShapeOrRecord = AnyShape> {
  /**
   * Shape of data in the topic.
   *
   * @default AnyShape
   */
  shape?: T;
  /**
   * Override serialziation mapper implementation. Messages are stringified
   * with a mapper when received/sent to/from a SQS Queue.
   *
   * @default Json
   */
  mapper?: MapperFactory<string>;
  /**
   * Override SQS Queue Props in the Build context - use this to change
   * configuration of the behavior with the AWS CDK.
   */
  queueProps?: Build<sqs.QueueProps>;
}
/**
 * Represents a SQS Queue containtining messages of type, `T`, serialized with some `Codec`.
 */
export class Queue<T extends ShapeOrRecord = AnyShape> implements Resource<sqs.Queue> {
  public readonly mapper: Mapper<Value.Of<T>, string>;
  public readonly mapperFactory: MapperFactory<string>;
  public readonly resource: Build<sqs.Queue>;
  public readonly shape: T;

  constructor(scope: Build<core.Construct>, id: string, props: QueueProps<T> = {}) {
    this.resource = scope.chain(scope =>
      (props.queueProps || Build.of({})).map(props =>
        new sqs.Queue(scope, id, props)));

    this.shape = (props.shape || any) as T;
    this.mapperFactory = props.mapper || json.stringifyMapper;
    this.mapper = this.mapperFactory(this.shape);
  }

  /**
   * Get a Lazy `Stream` of notifications Queue's messages.
   *
   * Warning: do not consume from the Queue twice - it does not have fan-out.
   */
  public messages(): Messages<Value.Of<T>, []> {
    const mapper = this.mapper;
    class Root extends Messages<Value.Of<T>, []> {
      /**
       * Bottom of the recursive async generator - returns the records
       * parsed and validated out of the SQSEvent.
       *
       * @param event payload of SQS event
       */
      public async *run(event: Event.Payload) {
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
   * A client with permission to consume and send messages.
   */
  public consumeAndSendAccess(): Dependency<Queue.ConsumeAndSendClient<Value.Of<T>>> {
    return this.dependency((queue, g) => {
      queue.grantConsumeMessages(g);
      queue.grantSendMessages(g);
    });
  }

  /**
   * A client with only permission to consume messages from this Queue.
   */
  public consumeAccess(): Dependency<Queue.ConsumeClient<Value.Of<T>>> {
    return this.dependency((queue, g) => queue.grantConsumeMessages(g));
  }

  /**
   * A client with only permission to send messages to this Queue.
   */
  public sendAccess(): Dependency<Queue.SendClient<Value.Of<T>>> {
    return this.dependency((queue, g) => queue.grantSendMessages(g));
  }

  private dependency<C>(grant: (queue: sqs.Queue, grantable: iam.IGrantable) => void): Dependency<C> {
    return {
      install: this.resource.map(queue => (ns, grantable) => {
        grant(queue, grantable);
        ns.set('queueUrl', queue.queueUrl);
      }),
      bootstrap: Run.of(async (ns, cache) =>
        new Queue.Client(
          ns.get('queueUrl'),
          cache.getOrCreate('aws:sqs', () => new AWS.SQS()),
          this.mapper) as any as C)
    };
  }
}

/**
 * Namespace for `Queue` type aliases and its `Client` implementation.
 */
export namespace Queue {
  export interface ConsumeAndSendClient<T> extends Client<T> {}
  export interface ConsumeClient<T> extends Omit<Client<T>, 'sendMessage' | 'sendMessageBatch'> {}
  export interface SendClient<T> extends Omit<Client<T>, 'receiveMessage'> {}

  export interface ReceiveMessageRequest extends Omit<AWS.SQS.ReceiveMessageRequest, 'QueueUrl'> {}
  export type ReceiveMessageResult<T> = Array<{Body: T} & Omit<AWS.SQS.Message, 'Body'>>;
  export interface SendMessageRequest extends Omit<AWS.SQS.SendMessageRequest, 'QueueUrl' | 'MessageBody'> {}
  export interface SendMessageResult extends AWS.SQS.SendMessageResult {}

  export interface SendMessageBatchRequestEntry<T> extends _SendMessageBatchRequestEntry<T> {}
  type _SendMessageBatchRequestEntry<T> = {MessageBody: T} & Omit<AWS.SQS.SendMessageBatchRequestEntry, 'MessageBody'>;

  export interface SendMessageBatchRequest<T> extends Array<SendMessageBatchRequestEntry<T>> {}
  export interface SendMessageBatchResult extends AWS.SQS.SendMessageBatchResult {}

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
    public sendMessage(message: T, request: SendMessageRequest = {}): Promise<SendMessageResult> {
      return this.client.sendMessage({
        QueueUrl: this.queueUrl,
        MessageBody: this.mapper.write(message),
        ...request,
      }).promise();
    }

    /**
     * Delivers a batch of messages to the specified queue.
     */
    public sendMessageBatch(request: SendMessageBatchRequest<T>): Promise<SendMessageBatchResult> {
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
          return result.Failed.map(r => values[parseInt(r.Id, 10)]);
        }
        return [];
      }, props, 10);
    }
  }
}
