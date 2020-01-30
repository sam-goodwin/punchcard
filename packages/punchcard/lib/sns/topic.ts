import AWS = require('aws-sdk');

import sns = require('@aws-cdk/aws-sns');
import snsSubs = require('@aws-cdk/aws-sns-subscriptions');
import core = require('@aws-cdk/core');

import json = require('@punchcard/shape-json');

import { any, AnyShape, Mapper, MapperFactory, Shape, ShapeOrRecord, Value } from '@punchcard/shape';
import { Namespace } from '../core/assembly';
import { Build } from '../core/build';
import { Cache } from '../core/cache';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import { Queue } from '../sqs/queue';
import { Sink, sink, SinkProps } from '../util/sink';
import { Event } from './event';
import { Notifications } from './notifications';

export interface TopicProps<T extends ShapeOrRecord = AnyShape> {
  /**
   * Shape of data in the topic.
   *
   * @default AnyShape
   */
  shape?: T;
  /**
   * Override serialziation mapper implementation. Messages are stringified
   * with a mapper when received/sent to/from a SNS Topic.
   *
   * @default Json
   */
  mapper?: MapperFactory<string>;
  /**
   * Override SNS Topic Props in the Build context - use this to change
   * configuration of the behavior with the AWS CDK.
   */
  topicProps?: Build<sns.TopicProps>;
}

/**
 * A SNS `Topic` with notifications of type, `T`.
 *
 * @typeparam T type of notifications sent and emitted from the `Topic`.
 */
export class Topic<T extends ShapeOrRecord = AnyShape> implements Resource<sns.Topic> {
  public readonly mapper: Mapper<Value.Of<T>, string>;
  public readonly mapperFactory: MapperFactory<string>;
  public readonly resource: Build<sns.Topic>;
  public readonly shape: T;

  constructor(scope: Build<core.Construct>, id: string, props: TopicProps<T> = {}) {
    this.resource = scope.chain(scope =>
      (props.topicProps || Build.of({})).map(props =>
        new sns.Topic(scope, id, props)));

    this.shape = (props.shape || any) as T;

    this.mapperFactory = props.mapper || json.stringifyMapper;
    this.mapper = this.mapperFactory(this.shape);
  }

  /**
   * Create a `Stream` for this topic's notifications - chainable computations (map, flatMap, filter, etc.)
   */
  public notifications(): Notifications<Value.Of<T>, []> {
    const mapper = this.mapperFactory(this.shape);
    class Root extends Notifications<Value.Of<T>, []> {
      /**
       * Return an iterator of records parsed from the raw data in the event.
       * @param event kinesis event sent to lambda
       */
      public async *run(event: Event.Payload) {
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
  public toSQSQueue(scope: Build<core.Construct>, id: string): Queue<T> {
    const q = new Queue(scope, id, {
      shape: this.shape,
      mapper: this.mapperFactory
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
  public subscribeQueue(queue: Queue<T>): Build<void> {
    return this.resource.chain(topic => queue.resource.map(queue => topic.addSubscription(new snsSubs.SqsSubscription(queue, {
      rawMessageDelivery: true
    }))));
  }

  public publishAccess(): Dependency<Topic.Client<Value.Of<T>>> {
    return {
      install: this.resource.map(topic => (ns, g) => {
        topic.grantPublish(g);
        ns.set('topicArn', topic.topicArn);
      }),
      bootstrap: Run.of(async (ns, cache) => new Topic.Client(
        this.mapperFactory(this.shape),
        ns.get('topicArn'),
        cache.getOrCreate('aws:sns', () => new AWS.SNS())))
    };
  }
}

export namespace Topic {
  type _PublishInput<T> = {Message: T} & Pick<AWS.SNS.PublishInput, 'MessageAttributes' | 'MessageStructure'>;
  export interface PublishInput<T> extends _PublishInput<T> {}

  export interface PublishResponse extends AWS.SNS.PublishResponse {}

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
