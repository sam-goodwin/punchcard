import iam = require('@aws-cdk/aws-iam');
import kinesis = require('@aws-cdk/aws-kinesis');
import { StartingPosition } from '@aws-cdk/aws-lambda';
import events = require('@aws-cdk/aws-lambda-event-sources');
import cdk = require('@aws-cdk/cdk');
import AWS = require('aws-sdk');
import uuid = require('uuid');
import { Clients, Dependency, Function, Runtime } from '../compute';
import { Cons } from '../compute/hlist';
import { Cache, PropertyBag } from '../compute/property-bag';
import { BufferMapper, Json, Mapper, Type } from '../shape';
import { Omit } from '../utils';
import { Monad, MonadProps } from './functor';
import { Resource } from './resource';
import { sink, Sink, SinkProps } from './sink';

declare module './functor' {
  interface Monad<E, T, D extends any[], P extends MonadProps> {
    toStream(scope: cdk.Construct, id: string, streamProps: StreamProps<T>, props?: P): [Stream<T>, Function<E, void, Dependency.List<Cons<D, Stream<T>>>>];
  }
}
Monad.prototype.toStream = function(scope: cdk.Construct, id: string, queueProps: StreamProps<any>): any {
  scope = new cdk.Construct(scope, id);
  const stream = new Stream(scope, 'Stream', queueProps);
  const l = this.forBatch(scope, 'Sink', {
    depends: stream,
    async handle(values, stream) {
      await stream.sink(values);
    }
  });
  return [stream, l];
};

export type StreamMonadProps = MonadProps & events.KinesisEventSourceProps;

export interface StreamProps<T> extends kinesis.StreamProps {
  type: Type<T>;
  /**
   * @default - uuid
   */
  partitionBy?: (record: T) => string;
}
export class Stream<T> implements Resource<kinesis.Stream>, Dependency<Stream.Client<T>> {
  public readonly context = {};
  public readonly mapper: Mapper<T, Buffer>;
  public readonly partitionBy: (record: T) => string;
  public readonly resource: kinesis.Stream;

  constructor(scope: cdk.Construct, id: string, props: StreamProps<T>) {
    this.resource = new kinesis.Stream(scope, id, props);
    this.mapper = BufferMapper.wrap(Json.forType(props.type));
    this.partitionBy = props.partitionBy || (_ => uuid());
  }

  public stream(): StreamMonad<T, []> {
    return new StreamMonad(this, this as any, {
      depends: [],
      handle: i => i
    });
  }

  public async *run(event: KinesisEvent): AsyncIterableIterator<T[]> {
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

  public readWriteClient(): Dependency<Stream.Client<T>> {
    return this._client(g => this.resource.grantReadWrite(g));
  }

  public readClient(): Dependency<Stream.Client<T>> {
    return this._client(g => this.resource.grantRead(g));
  }

  public writeClient(): Dependency<Stream.Client<T>> {
    return this._client(g => this.resource.grantWrite(g));
  }

  private _client(grant: (grantable: iam.IGrantable) => void): Dependency<Stream.Client<T>> {
    return {
      install: target => {
        target.properties.set('streamName', this.resource.streamName);
        grant(target.grantable);
      },
      bootstrap: this.bootstrap.bind(this),
    };
  }
}

export class StreamMonad<T, D extends any[]> extends Monad<KinesisEvent, T, D, StreamMonadProps>  {
  constructor(public readonly stream: Stream<any>, previous: StreamMonad<any, any>, input: {
    depends: D;
    handle: (value: AsyncIterableIterator<any>, deps: Clients<D>) => AsyncIterableIterator<T>;
  }) {
    super(previous, input.handle, input.depends);
  }

  public eventSource(props?: StreamMonadProps) {
    return new events.KinesisEventSource(this.stream.resource, props || {
      batchSize: 100,
      startingPosition: StartingPosition.TrimHorizon
    });
  }

  public chain<U, D2 extends any[]>(input: {
    depends: D2;
    handle: (value: AsyncIterableIterator<T>, deps: Clients<D2>) => AsyncIterableIterator<U>;
  }): StreamMonad<U, D2> {
    return new StreamMonad<U, D2>(this.stream, this, input);
  }
}

export namespace Stream {
  export type PutRecordInput<T> = {Data: T} & Omit<AWS.Kinesis.PutRecordInput, 'Data' | 'StreamName'>;
  export type PutRecordOutput = AWS.Kinesis.PutRecordOutput;
  export type PutRecordsInput<T> = Array<{Data: T} & Omit<AWS.Kinesis.PutRecordsRequestEntry, 'Data'>>;
  export type PutRecordsOutput = AWS.Kinesis.PutRecordsOutput;

  export class Client<T> implements Sink<T> {
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

    public async sink(records: T[], props?: SinkProps): Promise<void> {
      await sink(records, async values => {
        const result = await this.putRecords(values.map(value => ({
          Data: value,
          PartitionKey: this.stream.partitionBy(value)
        })));

        if (result.FailedRecordCount) {
          return result.Records.map((r, i) => {
            if (r.SequenceNumber) {
              return [i];
            } else {
              return [];
            }
          }).reduce((a, b) => a.concat(b)).map(i => values[i]);
        }
        return [];
      }, props, 500);
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
