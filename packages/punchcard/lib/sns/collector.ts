import core = require('@aws-cdk/core');

import { Collector } from '../collector';
import { Dependency } from '../dependency';
import { Cons } from '../hlist';
import { Function } from '../lambda/function';
import { RuntimeType, Type } from '../shape';
import { DependencyType, EventType, Stream } from '../stream';
import { Topic, TopicProps } from './topic';

/**
 * Add a utility method `toTopic` for `Stream` which uses the `TopicCollector` to produce SNS `Topics`.
 */
declare module '../stream' {
  interface Stream<E, T, D extends any[], C extends Stream.Config> {
    /**
     * Collect data to a SNS Topic (as notification messages).
     *
     * @param scope
     * @param id
     * @param topicProps properties of the created topic
     * @param runtimeProps optional runtime properties to configure the function processing the stream's data.
     * @typeparam T concrete type of data flowing to topic
     */
    toSNSTopic<DataType extends Type<T>>(scope: core.Construct, id: string, topicProps: TopicProps<DataType>, runtimeProps?: C): CollectedTopic<DataType, this>;
  }
}
Stream.prototype.toSNSTopic = function(scope: core.Construct, id: string, props: TopicProps<any>): any {
  return this.collect(scope, id, new TopicCollector(props));
};

/**
 * Creates a new SNS `Topic` and publishes data from a `Stream` to it.
 *
 * @typeparam T type of notififcations sent to (and emitted from) the SNS Topic.
 */
export class TopicCollector<T extends Type<any>, S extends Stream<any, RuntimeType<T>, any, any>> implements Collector<CollectedTopic<T, S>, S> {
  constructor(private readonly props: TopicProps<T>) { }

  public collect(scope: core.Construct, id: string, stream: S): CollectedTopic<T, S> {
    return new CollectedTopic(scope, id, {
      ...this.props,
      stream
    });
  }
}

/**
 * Properties for creating a collected `Topic`.
 */
export interface CollectedTopicProps<T extends Type<any>, S extends Stream<any, RuntimeType<T>, any, any>> extends TopicProps<T> {
  /**
   * Source of the data; a `Stream`.
   */
  readonly stream: S;
}

/**
 * A SNS `Topic` produced by collecting data from an `Stream`.
 * @typeparam T type of notififcations sent to, and emitted from, the SNS Topic.
 */
export class CollectedTopic<T extends Type<any>, S extends Stream<any, any, any, any>> extends Topic<T> {
  public readonly sender: Function<EventType<S>, void, Dependency.List<Cons<DependencyType<S>, Dependency<Topic.Client<T>>>>>;

  constructor(scope: core.Construct, id: string, props: CollectedTopicProps<T, S>) {
    super(scope, id, props);
    this.sender = props.stream.forBatch(this.resource, 'ToTopic', {
      depends: this,
      handle: async (events, self) => {
        self.sink(events);
      }
    }) as any;
  }
}