import iam = require('@aws-cdk/aws-iam');
import events = require('@aws-cdk/aws-lambda-event-sources');
import sqs = require('@aws-cdk/aws-sqs');
import core = require('@aws-cdk/core');
import AWS = require('aws-sdk');

import { Clients, Dependency, Lambda } from '../compute';
import { Cache, Namespace } from '../compute/assembly';
import { Cons } from '../compute/hlist';
import { Json, Mapper, RuntimeType, Type } from '../shape';
import { Omit } from '../utils';
import { Collector } from './collector';
import { Resource } from './resource';
import { sink, Sink, SinkProps } from './sink';
import { DependencyType, EventType, Stream } from './stream';

/**
 * Add a utility method `toQueue` for `Stream` which uses the `QueueCollector` to produce SQS `Queues`.
 */
declare module './stream' {
  interface Stream<E, T, D extends any[], C extends Stream.Config> {
    /**
     * Collect data to a SQS Queue (as messages).
     *
     * @param scope
     * @param id
     * @param queueProps properties of the created queue
     * @param runtimeProps optional runtime properties to configure the function processing the stream's data.
     * @typeparam T concrete type of data flowing to queue
     */
    toSQSQueue<DataType extends Type<T>>(scope: core.Construct, id: string, queueProps: SQS.QueueProps<DataType>, runtimeProps?: C): SQS.CollectedQueue<DataType, this>;
  }
}
Stream.prototype.toSQSQueue = function(scope: core.Construct, id: string, props: SQS.QueueProps<any>): any {
  return this.collect(scope, id, new SQS.QueueCollector(props));
};

export namespace SQS {
  export type Config = Stream.Config & events.SqsEventSourceProps;

  /**
   * Props for constructing a Queue.
   *
   * It extends the standard `sqs.QueueProps` with a `mapper` instance.
   */
  export interface QueueProps<T extends Type<any>> extends sqs.QueueProps {
    type: T;
  }
  /**
   * Represents a SQS Queue containtining messages of type, `T`, serialized with some `Codec`.
   */
  export class Queue<T extends Type<any>> implements Resource<sqs.Queue>, Dependency<Queue.ConsumeAndSendClient<T>> {
    public readonly context = {};
    public readonly mapper: Mapper<RuntimeType<T>, string>;
    public readonly resource: sqs.Queue;

    constructor(scope: core.Construct, id: string, props: QueueProps<T>) {
      this.resource = new sqs.Queue(scope, id, props);
      this.mapper = Json.forType(props.type);
    }

    public stream(): QueueStream<RuntimeType<T>, []> {
      const mapper = this.mapper;
      class Root extends QueueStream<RuntimeType<T>, []> {
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

  export class QueueStream<T, D extends any[]> extends Stream<Event, T, D, Config>  {
    constructor(public readonly queue: Queue<any>, previous: QueueStream<any, any>, input: {
      depends: D;
      handle: (value: AsyncIterableIterator<any>, deps: Clients<D>) => AsyncIterableIterator<T>;
    }) {
      super(previous, input.handle, input.depends);
    }

    public eventSource(props?: Config) {
      return new events.SqsEventSource(this.queue.resource, props);
    }

    public chain<U, D2 extends any[]>(input: {
      depends: D2;
      handle: (value: AsyncIterableIterator<T>, deps: Clients<D2>) => AsyncIterableIterator<U>;
    }): QueueStream<U, D2> {
      return new QueueStream<U, D2>(this.queue, this, input);
    }
  }

  /**
   * Namespace for `Queue` type aliases and its `Client` implementation.
   */
  export namespace Queue {
    export type ConsumeAndSendClient<T extends Type<any>> = Client<T>;
    export type ConsumeClient<T extends Type<any>> = Omit<Client<T>, 'sendMessage' | 'sendMessageBatch'>;
    export type SendClient<T extends Type<any>> = Omit<Client<T>, 'receiveMessage'>;

    export type ReceiveMessageRequest = Omit<AWS.SQS.ReceiveMessageRequest, 'QueueUrl'>;
    export type ReceiveMessageResult<T extends Type<any>> = Array<{Body: RuntimeType<T>} & Omit<AWS.SQS.Message, 'Body'>>;
    export type SendMessageRequest<T extends Type<any>> = {MessageBody: RuntimeType<T>} & Omit<AWS.SQS.SendMessageRequest, 'QueueUrl' | 'MessageBody'>;
    export type SendMessageResult = AWS.SQS.SendMessageResult;
    export type SendMessageBatchRequest<T extends Type<any>> = Array<{MessageBody: RuntimeType<T>} & Omit<AWS.SQS.SendMessageBatchRequestEntry, 'MessageBody'>>;
    export type SendMessageBatchResult = AWS.SQS.SendMessageBatchResult;

    /**
     * Runtime representation of a SQS Queue.
     */
    export class Client<T extends Type<any>> implements Sink<RuntimeType<T>> {
      constructor(
        public readonly queueUrl: string,
        public readonly client: AWS.SQS,
        public readonly mapper: Mapper<RuntimeType<T>, string>
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

      public async sink(records: Array<RuntimeType<T>>, props?: SinkProps): Promise<void> {
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

  /**
   * Shape of event sent to Lambda when subscribed to a SQS Queue.
   *
   * @see https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
   */
  export interface Event {
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

  /**
   * Creates a new SQS `Queue` and sends data from a `Stream` to it (as messages).
   *
   * @typeparam T type of messages in the SQS Queue.
   */
  export class QueueCollector<T extends Type<any>, E extends Stream<any, RuntimeType<T>, any, any>> implements Collector<CollectedQueue<T, E>, E> {
    constructor(private readonly props: QueueProps<T>) { }

    public collect(scope: core.Construct, id: string, stream: E): CollectedQueue<T, E> {
      return new CollectedQueue(scope, id, {
        ...this.props,
        stream
      });
    }
  }

  /**
   * Properties for creating a collected `Queue`.
   */
  export interface CollectedQueueProps<T extends Type<any>, E extends Stream<any, RuntimeType<T>, any, any>> extends QueueProps<T> {
    /**
     * Source of the data; a `Stream`.
     */
    readonly stream: E;
  }

  /**
   * A SQS `Queue` produced by collecting data from an `Stream`.
   * @typeparam T type of notififcations sent to, and emitted from, the SQS Queue.
   */
  export class CollectedQueue<T extends Type<any>, E extends Stream<any, any, any, any>> extends Queue<T> {
    public readonly sender: Lambda.Function<EventType<E>, void, Dependency.List<Cons<DependencyType<E>, Dependency<Queue.Client<T>>>>>;

    constructor(scope: core.Construct, id: string, props: CollectedQueueProps<T, E>) {
      super(scope, id, props);
      this.sender = props.stream.forBatch(this.resource, 'ToQueue', {
        depends: this,
        handle: async (events, self) => {
          self.sink(events);
        }
      }) as any;
    }
  }
}
