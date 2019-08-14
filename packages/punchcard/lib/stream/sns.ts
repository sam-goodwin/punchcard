import AWS = require('aws-sdk');

import iam = require('@aws-cdk/aws-iam');
import events = require('@aws-cdk/aws-lambda-event-sources');
import sns = require('@aws-cdk/aws-sns');
import snsSubs = require('@aws-cdk/aws-sns-subscriptions');
import core = require('@aws-cdk/core');

import { Clients, Dependency, Lambda } from '../compute';
import { Cache, Namespace } from '../compute/assembly';
import { Cons } from '../compute/hlist';
import { Json, Mapper, RuntimeType, Type } from '../shape';
import { Collector } from './collector';
import { Resource } from './resource';
import { Sink, sink, SinkProps } from './sink';
import { SQS } from './sqs';
import { DependencyType, EventType, Stream, StreamRuntime } from './stream';

export namespace SNS {
  export type TopicProps<T extends Type<any>> = {
    /**
     * Type of messages.
     */
    type: T;
  } & sns.TopicProps;

  /**
   * A SNS `Topic` with notifications of type, `T`.
   *
   * @typeparam T type of notifications sent and emitted from the `Topic`.
   */
  export class Topic<T extends Type<any>> implements Resource<sns.Topic>, Dependency<Topic.Client<T>> {
    public readonly context = {};
    public readonly type: T;
    public readonly mapper: Mapper<RuntimeType<T>, string>;
    public readonly resource: sns.Topic;

    constructor(scope: core.Construct, id: string, props: TopicProps<T>) {
      this.resource = new sns.Topic(scope, id, props);
      this.type = props.type;
      this.mapper = Json.forType(props.type);
    }

    /**
     * Create an enumerable for this topic's notifications - chainable computations (map, flatMap, filter, etc.)
     */
    public stream(): EnumerableTopic<RuntimeType<T>, []> {
      const mapper = this.mapper;
      class Root extends EnumerableTopic<RuntimeType<T>, []> {
        /**
         * Return an iterator of records parsed from the raw data in the event.
         * @param event kinesis event sent to lambda
         */
        public async *run(event: SNSEvent) {
          for (const record of event.Records) {
            yield mapper.read(record.Sns.Message);
          }
        }
      }
      return new Root(this, undefined as any, {
        depends: [],
        handle: i => i
      });
    }

    /**
     * Create a `Queue` and subscribe it to notifications from this `Topic`.
     *
     * The new queue has the same type of messages as this Topic's notifications (raw message delivery is always enabled).
     *
     * @param scope
     * @param id
     * @see https://docs.aws.amazon.com/sns/latest/dg/sns-sqs-as-subscriber.html
     * @see https://docs.aws.amazon.com/sns/latest/dg/sns-large-payload-raw-message-delivery.html
     */
    public toSQSQueue(scope: core.Construct, id: string): SQS.Queue<T> {
      const q = new SQS.Queue(scope, id, {
        type: this.type
      });
      this.subscribeQueue(q);
      return q;
    }

    /**
     * Subscribe a `Queue` to notifications from this `Topic`.
     *
     * The Queue must habe the same type of messages as this Topic's notifications (raw message delivery is always enabled).
     *
     * @param queue to subscribe to this `Topic`.
     */
    public subscribeQueue(queue: SQS.Queue<T>): void {
      this.resource.addSubscription(new snsSubs.SqsSubscription(queue.resource, {
        rawMessageDelivery: true
      }));
    }

    /**
     * Create a client for this `Topic` from within a `Runtime` environment (e.g. a Lambda Function.).
     * @param namespace runtime properties local to this `Topic`.
     * @param cache global `Cache` shared by all clients.
     */
    public async bootstrap(namespace: Namespace, cache: Cache): Promise<Topic.Client<T>> {
      return new Topic.Client(this.mapper, namespace.get('topicArn'), cache.getOrCreate('aws:sns', () => new AWS.SNS()));
    }

    /**
     * Set `topicArn` and grant permissions to a `Runtime` so it may `bootstrap` a client for this `Topic`.
     */
    public install(namespace: Namespace, grantable: iam.IGrantable): void {
      this.resource.grantPublish(grantable);
      namespace.set('topicArn', this.resource.topicArn);
    }
  }

  /**
   * An enumerable SNS `Topic`.
   */
  export class EnumerableTopic<T, D extends any[]> extends Stream<SNSEvent, T, D, StreamRuntime>  {
    constructor(public readonly topic: Topic<any>, previous: EnumerableTopic<any, any>, input: {
      depends: D;
      handle: (value: AsyncIterableIterator<any>, deps: Clients<D>) => AsyncIterableIterator<T>;
    }) {
      super(previous, input.handle, input.depends);
    }

    /**
     * Create a `SnsEventSource` which attaches a Lambda Function to this `Topic`.
     */
    public eventSource() {
      return new events.SnsEventSource(this.topic.resource);
    }

    /**
     * Chain a computation and dependency pair with this computation.
     * @param input the next computation along with its dependencies.
     */
    public chain<U, D2 extends any[]>(input: {
      depends: D2;
      handle: (value: AsyncIterableIterator<T>, deps: Clients<D2>) => AsyncIterableIterator<U>;
    }): EnumerableTopic<U, D2> {
      return new EnumerableTopic<U, D2>(this.topic, this, input);
    }
  }

  export namespace Topic {
    export type PublishInput<T> = {Message: T} & Pick<AWS.SNS.PublishInput, 'MessageAttributes' | 'MessageStructure'>;
    export type PublishResponse = AWS.SNS.PublishResponse;

    /**
     * A client to a specific SNS `Topic` with messages of some type, `T`.
     *
     * @typeparam T type of messages sent to (and emitted by) the SNS `Topic.
     * @see https://aws.amazon.com/sns/faqs/ (scroll down to limits section)
     */
    export class Client<T extends Type<any>> implements Sink<T> {
      constructor(
        public readonly mapper: Mapper<T, string>,
        public readonly topicArn: string,
        public readonly client: AWS.SNS) {}

        /**
         * Publish a message to this SNS `Topic`.
         *
         * @param message content to send
         * @param messageAttributes optional message attributes
         */
      public publish(message: RuntimeType<T>, messageAttributes?: {[key: string]: AWS.SNS.MessageAttributeValue}): Promise<PublishResponse> {
        return this.client.publish({
          Message: this.mapper.write(message),
          MessageAttributes: messageAttributes,
          TopicArn: this.topicArn
        }).promise();
      }

      /**
       * Publish multiple messages to this `Topic`; intermittent failures will be handled with back-offs and retry attempts.
       *
       * @param messages messages to publish
       * @param props optional properties to tune retry and concurrency behavior.
       */
      public async sink(messages: Array<RuntimeType<T>>, props?: SinkProps): Promise<void> {
        await sink(messages, async ([value]) => {
          try {
            await this.publish(value);
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

  /**
   * Creates a new SNS `Topic` and publishes data from an enumerable to it.
   *
   * @typeparam T type of notififcations sent to (and emitted from) the SNS Topic.
   */
  export class TopicCollector<T extends Type<any>, E extends Stream<any, RuntimeType<T>, any, any>> implements Collector<CollectedTopic<T, E>, E> {
    constructor(private readonly props: TopicProps<T>) { }

    public collect(scope: core.Construct, id: string, enumerable: E): CollectedTopic<T, E> {
      return new CollectedTopic(scope, id, {
        ...this.props,
        enumerable
      });
    }
  }

  /**
   * Properties for creating a collected `Topic`.
   */
  export interface CollectedTopicProps<T extends Type<any>, E extends Stream<any, RuntimeType<T>, any, any>> extends TopicProps<T> {
    /**
     * Source of the data; an enumerable.
     */
    readonly enumerable: E;
  }

  /**
   * A SNS `Topic` produced by collecting data from an `Enumerable`.
   * @typeparam T type of notififcations sent to, and emitted from, the SNS Topic.
   */
  export class CollectedTopic<T extends Type<any>, E extends Stream<any, any, any, any>> extends Topic<T> {
    public readonly sender: Lambda.Function<EventType<E>, void, Dependency.List<Cons<DependencyType<E>, Dependency<Topic.Client<T>>>>>;

    constructor(scope: core.Construct, id: string, props: CollectedTopicProps<T, E>) {
      super(scope, id, props);
      this.sender = props.enumerable.forBatch(this.resource, 'ToTopic', {
        depends: this,
        handle: async (events, self) => {
          self.sink(events);
        }
      }) as any;
    }
  }
}

/**
 * Add a utility method `toTopic` for `Enumerable` which uses the `TopicCollector` to produce SNS `Topics`.
 */
declare module './stream' {
  interface Stream<E, T, D extends any[], R extends StreamRuntime> {
    /**
     * Collect data to a SNS Topic (as notification messages).
     *
     * @param scope
     * @param id
     * @param topicProps properties of the created topic
     * @param runtimeProps optional runtime properties to configure the function processing the enumerable's data.
     * @typeparam T concrete type of data flowing to topic
     */
    toSNSTopic<DataType extends Type<T>>(scope: core.Construct, id: string, topicProps: SNS.TopicProps<DataType>, runtimeProps?: R): SNS.CollectedTopic<DataType, this>;
  }
}
Stream.prototype.toSNSTopic = function(scope: core.Construct, id: string, props: SNS.TopicProps<any>): any {
  return this.collect(scope, id, new SNS.TopicCollector(props));
};
