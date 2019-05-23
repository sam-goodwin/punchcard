import iam = require('@aws-cdk/aws-iam');
import kinesis = require('@aws-cdk/aws-kinesis');
import lambda = require('@aws-cdk/aws-lambda');
import events = require('@aws-cdk/aws-lambda-event-sources');
import cdk = require('@aws-cdk/cdk');
import AWS = require('aws-sdk');
import uuid = require('uuid');
import { LambdaExecutorService } from '../compute';
import { Cache, PropertyBag } from '../property-bag';
import { Client, ClientContext, Clients, Runtime } from '../runtime';
import { Mapper } from '../shape';
import { Omit } from '../utils';
import { EnumerateProps, IEnumerable } from './enumerable';

export type EnumerateStreamProps = EnumerateProps & events.KinesisEventSourceProps;

export interface IStream<T, C extends ClientContext> extends IEnumerable<T, C, EnumerateStreamProps> {
  run(event: KinesisEvent, clients: Clients<C>): AsyncIterableIterator<T[]>;

  map<U>(f: (value: T, clients: Clients<C>) => Promise<U>): IStream<U, C>;
  // collect<C>(scope: cdk.Construct, id: string, collector: ICollector<T, C>): C;
}
export interface StreamProps<T> extends kinesis.StreamProps {
  mapper: Mapper<T, Buffer>;
  /**
   * @default uuid
   */
  partitionBy?: (record: T) => string;
}
export class Stream<T> extends kinesis.Stream implements Client<Stream.Client<T>>, IStream<T, {}> {
  public readonly context = {};
  public readonly mapper: Mapper<T, Buffer>;
  public readonly partitionBy: (record: T) => string;

  constructor(scope: cdk.Construct, id: string, props: StreamProps<T>) {
    super(scope, id, props);
    this.mapper = props.mapper;
    this.partitionBy = props.partitionBy || (_ => uuid());
  }

  public async *run(event: KinesisEvent): AsyncIterableIterator<T[]> {
    return yield event.Records.map(record => {
      return this.mapper.read(Buffer.from(record.kinesis.data, 'base64'));
    });
  }

  public map<U>(f: (value: T, clients: Clients<{}>) => Promise<U>): IStream<U, {}> {
    return new ContextualizedStream(this, this, this.context, async (values, clients) => {
      return await Promise.all(values.map(v => f(v, clients)));
    });
  }

  public forBatch(scope: cdk.Construct, id: string, f: (values: T[], clients: Clients<{}>) => Promise<any>, props?: EnumerateStreamProps): lambda.Function {
    return new ContextualizedStream<T, T, {}>(this, this, this.context, v => Promise.resolve(v)).forBatch(scope, id, f as any, props);
  }

  public forEach(scope: cdk.Construct, id: string, f: (value: T, clients: Clients<{}>) => Promise<any>, props?: EnumerateStreamProps): lambda.Function {
    return new ContextualizedStream<T, T, {}>(this, this, this.context, v => Promise.resolve(v)).forEach(scope, id, f as any, props);
  }

  public clients<C extends ClientContext>(context: C): IEnumerable<T, C, EnumerateStreamProps> {
    return new ContextualizedStream<T, T, C>(this, this as any, {
      ...this.context,
      ...context
    }, v => Promise.resolve(v));
  }

  public bootstrap(properties: PropertyBag, cache: Cache): Stream.Client<T> {
    return new Stream.Client(this,
      properties.get('streamName'),
      cache.getOrCreate('aws:kinesis', () => new AWS.Kinesis()));
  }

  public install(target: Runtime): void {
    this.readWriteClient().install(target);
  }

  public readWriteClient(): Client<Stream.Client<T>> {
    return this._client(this.grantReadWrite.bind(this));
  }

  public readClient(): Client<Stream.Client<T>> {
    return this._client(this.grantRead.bind(this));
  }

  public writeClient(): Client<Stream.Client<T>> {
    return this._client(this.grantWrite.bind(this));
  }

  private _client(grant: (grantable: iam.IGrantable) => void): Client<Stream.Client<T>> {
    return {
      install: target => {
        target.properties.set('streamName', this.streamName);
        grant(target.grantable);
      },
      bootstrap: this.bootstrap.bind(this),
    };
  }
}

export class ContextualizedStream<T, U, C extends ClientContext> implements IStream<U, C> {
  constructor(
    private readonly stream: Stream<any>,
    private readonly parent: IStream<T, C>,
    public readonly context: C,
    private readonly f: (values: T[], clients: Clients<C>) => Promise<U[]>) {}

  public async *run(event: KinesisEvent, clients: Clients<C>): AsyncIterableIterator<U[]> {
    for await (const prev of this.parent.run(event, clients)) {
      yield await this.f(prev, clients);
    }
  }

  public map<V>(f: (value: U, clients: Clients<C>) => Promise<V>): IStream<V, C> {
    return new ContextualizedStream(this.stream, this, this.context,
      (values, clients) => Promise.all(values.map(v => f(v, clients))));
  }

  public forEach(scope: cdk.Construct, id: string, f: (value: U, clients: Clients<C>) => Promise<any>, props?: EnumerateStreamProps): lambda.Function {
    return this.forBatch(scope, id, (values, clients) => Promise.all(values.map(v => f(v, clients))), props);
  }

  public forBatch(scope: cdk.Construct, id: string, f: (values: U[], clients: Clients<C>) => Promise<any>, props?: EnumerateStreamProps): lambda.Function {
    props = props || {
      batchSize: 100,
      startingPosition: lambda.StartingPosition.TrimHorizon
    };
    props.executorService = props.executorService || new LambdaExecutorService({
      memorySize: 128,
      timeout: 10
    });
    const lambdaFn = props.executorService.spawn(scope, id, {
      clients: this.context,
      handle: async (event: KinesisEvent, clients) => {
        for await (const batch of this.run(event, clients)) {
          await f(batch, clients);
        }
      }
    });
    lambdaFn.addEventSource(new events.KinesisEventSource(this.stream, props));
    return lambdaFn;
  }

  public clients<R2 extends ClientContext>(context: R2): IEnumerable<U, C & R2, EnumerateStreamProps> {
    return new ContextualizedStream(this.stream, this.parent as any, {
      ...this.context,
      ...context
    }, this.f);
  }
}

export namespace Stream {
  export type PutRecordInput<T> = {Data: T} & Omit<AWS.Kinesis.PutRecordInput, 'Data' | 'StreamName'>;
  export type PutRecordOutput = AWS.Kinesis.PutRecordOutput;
  export type PutRecordsInput<T> = Array<{Data: T} & Omit<AWS.Kinesis.PutRecordsRequestEntry, 'Data'>>;
  export type PutRecordsOutput = AWS.Kinesis.PutRecordsOutput;

  export interface Retry {
    attemptsLeft: number;
    backoffMs: number;
    maxBackoffMs: number;
  }

  export class Client<T> {
    constructor(
      public readonly stream: Stream<T>,
      public readonly streamName: string,
      public readonly client: AWS.Kinesis
    ) {}

    public putRecord(request: PutRecordInput<T>): Promise<PutRecordOutput> {
      return this.client.putRecord({
        ...request,
        StreamName: this.streamName,
        Data: this.stream.mapper.write(request.Data)
      }).promise();
    }

    public putRecords(request: PutRecordsInput<T>): Promise<PutRecordsOutput> {
      return this.client.putRecords({
        StreamName: this.streamName,
        Records: request.map(record => ({
          ...record,
          Data: this.stream.mapper.write(record.Data)
        }))
      }).promise();
    }

    public async putAll(records: T[], retry: Retry = {
      attemptsLeft: 3,
      backoffMs: 100,
      maxBackoffMs: 10000
    }): Promise<void> {
      const send = (async (values: T[], retry: Retry): Promise<void> => {
        if (values.length <= 500) {
          const result = await this.putRecords(values.map(value => ({
            Data: value,
            PartitionKey: this.stream.partitionBy(value)
          })));

          if (result.FailedRecordCount) {
            if (retry.attemptsLeft === 0) {
              throw new Error(`failed to send records to Kinesis after 3 attempts`);
            }

            const redrive = result.Records.map((r, i) => {
              if (r.SequenceNumber) {
                return [i];
              } else {
                return [];
              }
            }).reduce((a, b) => a.concat(b)).map(i => values[i]);

            return send(redrive, increment(retry));
          }
        } else {
          await Promise.all([
            await send(records.slice(0, Math.floor(records.length / 2)), increment(retry)),
            await send(records.slice(Math.floor(records.length / 2), records.length), increment(retry))
          ]);
        }

        function increment(retry: Retry) {
          const backoffMs = Math.min(2 * retry.backoffMs,  retry.maxBackoffMs);
          return {
            attemptsLeft: retry.attemptsLeft - 1,
            backoffMs,
            maxBackoffMs: retry.maxBackoffMs
          };
        }
      });
      await send(records, retry);
    }
  }
}

/**
 * Payload sent to Lambda Function subscribed to a Kinesis Stream.
 *
 * @see https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html
 */
export interface KinesisEvent {
  Records: Array<{
    kinesis: {
      kinesisSchemaVersion: string;
      partitionKey: string;
      sequenceNumber: string;
      data: string;
      approximateArrivalTimestamp: number;
    };
    eventSource: string;
    eventVersion: string;
    eventID: string;
    eventName: string;
    invokeIdentityArn: string;
    awsRegion: string;
    eventSourceARN: string;
  }>;
}
