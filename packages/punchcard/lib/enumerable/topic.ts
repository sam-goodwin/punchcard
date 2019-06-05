import AWS = require('aws-sdk');

import events = require('@aws-cdk/aws-lambda-event-sources');
import sns = require('@aws-cdk/aws-sns');
import cdk = require('@aws-cdk/cdk');

import { Cache, Clients, Dependency, PropertyBag, Runtime } from '../compute';
import { Function } from '../compute';
import { Cons } from '../compute/hlist';
import { Json, Mapper, RuntimeType, Type } from '../shape';
import { Collector } from './collector';
import { DependencyType, Enumerable, EnumerableRuntime, EventType } from './enumerable';
import { Queue } from './queue';
import { Resource } from './resource';
import { Sink, sink, SinkProps } from './sink';

export type TopicProps<T> = {
  /**
   * Type of messages.
   */
  type: Type<T>;
} & sns.TopicProps;

/**
 * A SNS `Topic` with notificaqtions of type, `T`.
 *
 * @typeparam T type of notifications sent and emitted from the `Topic`.
 */
export class Topic<T> implements Resource<sns.Topic>, Dependency<Topic.Client<T>> {
  public readonly context = {};
  public readonly type: Type<T>;
  public readonly mapper: Mapper<T, string>;
  public readonly resource: sns.Topic;

  constructor(scope: cdk.Construct, id: string, props: TopicProps<T>) {
    this.resource = new sns.Topic(scope, id, props);
    this.type = props.type;
    this.mapper = Json.forType(props.type);
  }

  /**
   * Create an enumerable for this topic's notifications - chainable computations (map, flatMap, filter, etc.)
   */
  public enumerable(): EnumerableTopic<T, []> {
    return new EnumerableTopic(this, this as any, {
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
  public toQueue(scope: cdk.Construct, id: string): Queue<T> {
    const q = new Queue(scope, id, {
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
  public subscribeQueue(queue: Queue<T>): sns.Subscription {
    return this.resource.subscribeQueue(queue.resource, true);
  }

  /**
   * Return an iterator of parsed messages.
   * @param event sns event sent to a `Function` subscribed to this `Topic`.
   */
  public async *run(event: SNSEvent): AsyncIterableIterator<T> {
    for (const record of event.Records) {
      yield this.mapper.read(record.Sns.Message);
    }
  }

  /**
   * Create a client for this `Topic` from within a `Runtime` environment (e.g. a Lambda Function.).
   * @param properties runtime properties local to this `Topic`.
   * @param cache global `Cache` shared by all clients.
   */
  public bootstrap(properties: PropertyBag, cache: Cache): Topic.Client<T> {
    return new Topic.Client(this.mapper, properties.get('topicArn'), cache.getOrCreate('aws:sns', () => new AWS.SNS()));
  }

  /**
   * Set `topicArn` and grant permissions to a `Runtime` so it may `bootstrap` a client for this `Topic`.
   * @param target runtime to install this `Topic` into.
   */
  public install(target: Runtime): void {
    this.resource.grantPublish(target.grantable);
    target.properties.set('topicArn', this.resource.topicArn);
  }
}

/**
 * An enumerable SNS `Topic`.
 */
export class EnumerableTopic<T, D extends any[]> extends Enumerable<SNSEvent, T, D, EnumerableRuntime>  {
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
  export class Client<T> implements Sink<T> {
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
    public publish(message: T, messageAttributes?: {[key: string]: AWS.SNS.MessageAttributeValue}): Promise<PublishResponse> {
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
    public async sink(messages: T[], props?: SinkProps): Promise<void> {
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
export class TopicCollector<T extends Type<any>, E extends Enumerable<any, RuntimeType<T>, any, any>> implements Collector<CollectedTopic<T, E>, E> {
  constructor(private readonly props: TopicProps<T>) { }

  public collect(scope: cdk.Construct, id: string, enumerable: E): CollectedTopic<T, E> {
    return new CollectedTopic(scope, id, {
      ...this.props,
      enumerable
    });
  }
}

/**
 * Properties for creating a collected `Topic`.
 */
export interface CollectedTopicProps<T extends Type<any>, E extends Enumerable<any, RuntimeType<T>, any, any>> extends TopicProps<T> {
  /**
   * Source of the data; an enumerable.
   */
  readonly enumerable: E;
}

/**
 * A SNS `Topic` produced by collecting data from an `Enumerable`.
 * @typeparam T type of notififcations sent to, and emitted from, the SNS Topic.
 */
export class CollectedTopic<T extends Type<any>, E extends Enumerable<any, any, any, any>> extends Topic<T> {
  public readonly sender: Function<EventType<E>, void, Dependency.List<Cons<DependencyType<E>, Dependency<Topic.Client<T>>>>>;

  constructor(scope: cdk.Construct, id: string, props: CollectedTopicProps<T, E>) {
    super(scope, id, props);
    this.sender = props.enumerable.forBatch(this.resource, 'ToTopic', {
      depends: this,
      handle: async (events, self) => {
        self.sink(events);
      }
    }) as any;
  }
}

/**
 * Add a utility method `toTopic` for `Enumerable` which uses the `TopicCollector` to produce SNS `Topics`.
 */
declare module './enumerable' {
  interface Enumerable<E, I, D extends any[], R extends EnumerableRuntime> {
    /**
     * Collect data to a SNS Topic (as notification messages).
     *
     * @param scope
     * @param id
     * @param topicProps properties of the created topic
     * @param runtimeProps optional runtime properties to configure the function processing the enumerable's data.
     * @typeparam T concrete type of data flowing to topic
     */
    toTopic<T extends Type<I>>(scope: cdk.Construct, id: string, topicProps: TopicProps<T>, runtimeProps?: R): CollectedTopic<T, this>;
  }
}
Enumerable.prototype.toTopic = function(scope: cdk.Construct, id: string, props: TopicProps<any>): any {
  return this.collect(scope, id, new TopicCollector(props));
};
