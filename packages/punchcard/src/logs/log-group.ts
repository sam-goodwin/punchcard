import AWS = require('aws-sdk');

import { AnyShape, Mapper, MapperFactory, Shape, Value, any } from '@punchcard/shape';
import { Json } from '@punchcard/shape-json';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import { Sink, sink, SinkProps } from '../util/sink';
import { Event } from './event';
import { Events } from './events';

import type * as cdk from '@aws-cdk/core';
import type * as logs from '@aws-cdk/aws-logs';

export interface LogGroupProps<T extends Shape = AnyShape> {
  /**
   * Shape of data in the log group.
   *
   * @default AnyShape
   */
  shape?: T;

  /**
   * Override serialziation mapper implementation.
   *
   * Log events are stringified with a mapper when written to and read from a log group.
   *
   * @default Json.stringifyMapper
   */
  mapper?: MapperFactory<string>;

  /**
   * Override LogGroupProps in the Build context.
   *
   * Use this to configure the log group created by the AWS CDK.
   */
  logGroupProps?: Build<logs.LogGroupProps>
}


/**
 * A CloudWatch Logs `LogGroup` with log events of type `T`.
 *
 * @typeparam T type of log events written to and read from the `LogGroup`.
 */
export class LogGroup<T extends Shape = AnyShape> implements Resource<logs.LogGroup> {
  public readonly mapperFactory: MapperFactory<string>;
  public readonly resource: Build<logs.LogGroup>;
  public readonly shape: T;

  constructor(scope: Build<cdk.Construct>, id: string, props: LogGroupProps<T> = {}) {
    this.resource = CDK.chain(({ logs }) => {
      return scope.chain(scope => {
        return (props.logGroupProps ?? Build.empty).map(props => new logs.LogGroup(scope, id, props));
      });
    });

    this.shape = (props?.shape ?? any) as T;

    this.mapperFactory = props?.mapper ?? Json.stringifyMapper;
  }

  public events(): Events<Value.Of<T>, []> {
    const mapper = this.mapperFactory(this.shape);
    return new class extends Events<Value.Of<T>, []> {
      /**
       * Return an iterator of records parsed from the raw data in the event.
       * @param event kinesis event sent to lambda
       */
      public async *run(payload: Event.Payload) {
        const zlib = require('zlib');
        const encodedData = Buffer.from(payload.awslogs.data, 'base64');
        const data: Event.Data = JSON.parse(zlib.gunzipSync(encodedData).toString())
        for (const event of data.logEvents) {
          try {
            yield mapper.read(event.message);
          } catch (e) {
            throw new Error(`Could not map ${event.message} to type. Are you setting the right mapper for your data?`);
          }
        }
      }
    }(this, undefined as any, { depends: [], handle: i => i });
  }

  public putAccess(): Dependency<LogGroup.Client<Value.Of<T>>> {
    return {
      install: this.resource.map(logGroup => (ns, g) => {
        logGroup.grantWrite(g);
        ns.set('logGroupName', logGroup.logGroupName);
      }),
      bootstrap: Run.of(async (ns, cache) => new LogGroup.Client(
        this.mapperFactory(this.shape),
        ns.get('logGroupName'),
        cache.getOrCreate('aws:logs', () => new AWS.CloudWatchLogs())))
    };
  }
}

export namespace LogGroup {
  export interface PutResponse extends AWS.CloudWatchLogs.PutLogEventsResponse {}

  /**
   * A client to a specific CloudWatch Logs log group with events of some type, `T`.
   *
   * @typeparam T type of events written to and read from the log group.
   */
  export class Client<T> implements Sink<T> {
    constructor(
      public readonly mapper: Mapper<T, string>,
      public readonly logGroupName: string,
      public readonly client: AWS.CloudWatchLogs) {}

    /**
     * Put events to this log group.
     *
     * @param events events to send
     */
    public async put(...events: T[]): Promise<PutResponse> {
      const uuid = require('uuid');
      const logStreamName = uuid.v4();
      await this.client.createLogStream({
        logGroupName: this.logGroupName,
        logStreamName,
      }).promise();
      const now = Date.now();
      return this.client.putLogEvents({
        logEvents: events.map(event => ({
          message: this.mapper.write(event),
          timestamp: now,
        })),
        logGroupName: this.logGroupName,
        logStreamName,
      }).promise();
    }

    /**
     * Put multiple events to this log group; intermittent failures will be handled with back-offs and retry attempts.
     *
     * @param events events to put
     * @param props optional properties to tune retry and concurrency behavior.
     */
    public async sink(events: T[], props?: SinkProps): Promise<void> {
      // TODO: add support in `sink` for `batchSize` based on bytes
      await sink(events, async (values) => {
        try {
          const response = await this.put(...values);
          // Only redrive log events that are too new; old events and expired events will never be accepted
          if (response.rejectedLogEventsInfo && response.rejectedLogEventsInfo.tooNewLogEventStartIndex) {
            return values.slice(response.rejectedLogEventsInfo.tooNewLogEventStartIndex);
          }
          return [];
        } catch (err) {
          console.error(err);
          return values;
        }
      }, props, 10000);
    }
  }
}
