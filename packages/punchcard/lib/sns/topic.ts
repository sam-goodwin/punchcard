import AWS = require('aws-sdk');

import iam = require('@aws-cdk/aws-iam');
import sns = require('@aws-cdk/aws-sns');
import snsSubs = require('@aws-cdk/aws-sns-subscriptions');
import core = require('@aws-cdk/core');

import { Namespace } from '../core/assembly';
import { Cache } from '../core/cache';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Json, Mapper, RuntimeType, Type } from '../shape';
import { Queue } from '../sqs/queue';
import { Sink, sink, SinkProps } from '../util/sink';
import { Event } from './event';
import { TopicStream } from './stream';

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
   * Create a `Stream` for this topic's notifications - chainable computations (map, flatMap, filter, etc.)
   */
  public stream(): TopicStream<RuntimeType<T>, []> {
    const mapper = this.mapper;
    class Root extends TopicStream<RuntimeType<T>, []> {
      /**
       * Return an iterator of records parsed from the raw data in the event.
       * @param event kinesis event sent to lambda
       */
      public async *run(event: Event) {
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
  public toSQSQueue(scope: core.Construct, id: string): Queue<T> {
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
  public subscribeQueue(queue: Queue<T>): void {
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
