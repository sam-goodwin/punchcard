import iam = require('@aws-cdk/aws-iam');
import kinesis = require('@aws-cdk/aws-kinesis');
import { StartingPosition } from '@aws-cdk/aws-lambda';
import events = require('@aws-cdk/aws-lambda-event-sources');
import cdk = require('@aws-cdk/cdk');
import AWS = require('aws-sdk');
import uuid = require('uuid');
import { Cache, PropertyBag } from '../property-bag';
import { Client, ClientContext, Clients, Runtime } from '../runtime';
import { Mapper } from '../shape';
import { Omit } from '../utils';
import { Chain, FunctorProps, Monad } from './functor';
import { Resource } from './resource';

export type StreamFunctorProps = FunctorProps & events.KinesisEventSourceProps;

export interface IStream<T, C extends ClientContext> extends Monad<KinesisEvent, T, C, StreamFunctorProps> {
}

export interface StreamProps<T> extends kinesis.StreamProps {
  mapper: Mapper<T, Buffer>;
  /**
   * @default - uuid
   */
  partitionBy?: (record: T) => string;
}
export class Stream<T> extends Monad<KinesisEvent, T[], {}, StreamFunctorProps>
    implements IStream<T[], {}>, Client<Stream.Client<T>>, Resource<kinesis.Stream> {
  public readonly context = {};
  public readonly mapper: Mapper<T, Buffer>;
  public readonly partitionBy: (record: T) => string;
  public readonly resource: kinesis.Stream;

  constructor(scope: cdk.Construct, id: string, props: StreamProps<T>) {
    super({});
    this.resource = new kinesis.Stream(scope, id, props);
    this.mapper = props.mapper;
    this.partitionBy = props.partitionBy || (_ => uuid());
  }

  public eventSource(props?: StreamFunctorProps) {
    return new events.KinesisEventSource(this.resource, props || {
      batchSize: 100,
      startingPosition: StartingPosition.TrimHorizon
    });
  }

  public chain<U, C2 extends ClientContext>(context: C2, f: (value: T[], clients: Clients<{}>) => Promise<U[]>): IStream<U, C2> {
    return new StreamChain(context, this as any, f);
  }

  public async *run(event: KinesisEvent, clients: Clients<{}>): AsyncIterableIterator<T[]> {
    return yield event.Records.map(record => this.mapper.read(Buffer.from(record.kinesis.data, 'base64')));
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
    return this._client(g => this.resource.grantReadWrite(g));
  }

  public readClient(): Client<Stream.Client<T>> {
    return this._client(g => this.resource.grantRead(g));
  }

  public writeClient(): Client<Stream.Client<T>> {
    return this._client(g => this.resource.grantWrite(g));
  }

  private _client(grant: (grantable: iam.IGrantable) => void): Client<Stream.Client<T>> {
    return {
      install: target => {
        target.properties.set('streamName', this.resource.streamName);
        grant(target.grantable);
      },
      bootstrap: this.bootstrap.bind(this),
    };
  }
}

class StreamChain<T, U, C extends ClientContext> extends Chain<KinesisEvent, T, U, C, StreamFunctorProps> {
  public chain<V, C2 extends ClientContext>(context: C2, f: (value: U, clients: Clients<C>) => Promise<V[]>): StreamChain<U, V, C & C2> {
    return new StreamChain({...context, ...this.context}, this as any, f);
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
