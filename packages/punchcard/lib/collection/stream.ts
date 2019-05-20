import iam = require('@aws-cdk/aws-iam');
import kinesis = require('@aws-cdk/aws-kinesis');
import lambda = require('@aws-cdk/aws-lambda');
import events = require('@aws-cdk/aws-lambda-event-sources');
import cdk = require('@aws-cdk/cdk');
import AWS = require('aws-sdk');
import { LambdaExecutorService } from '../lambda/executor';
import { Cache, PropertyBag } from '../property-bag';
import { Client, Lifted, Runtime, RuntimeContext } from '../runtime';
import { Mapper } from '../shape';
import { Omit } from '../utils';
import { EnumerateProps, IEnumerable } from './collection';

export type EnumerateStreamProps = EnumerateProps & events.KinesisEventSourceProps;
export interface StreamProps<T> extends kinesis.StreamProps {
  mapper: Mapper<T, Buffer>;
}
export class Stream<T> extends kinesis.Stream implements Client<Stream.Client<T>>, IEnumerable<T, {}, EnumerateStreamProps> {
  public readonly context = {};
  public readonly mapper: Mapper<T, Buffer>;

  constructor(scope: cdk.Construct, id: string, props: StreamProps<T>) {
    super(scope, id, props);
    this.mapper = props.mapper;
  }

  public forBatch(scope: cdk.Construct, id: string, f: (values: T[], clients: Lifted<{}>) => Promise<any>, props?: EnumerateStreamProps): lambda.Function {
    return new ContextualizedStream(this, this.context).forBatch(scope, id, f, props);
  }

  public forEach(scope: cdk.Construct, id: string, f: (value: T, clients: Lifted<{}>) => Promise<any>, props?: EnumerateStreamProps): lambda.Function {
    return new ContextualizedStream(this, this.context).forEach(scope, id, f, props);
  }

  public lift<R2 extends RuntimeContext>(context: R2): IEnumerable<T, R2, EnumerateStreamProps> {
    return new ContextualizedStream(this, {
      ...this.context,
      ...context
    });
  }

  public bootstrap(properties: PropertyBag, cache: Cache): Stream.Client<T> {
    return new Stream.Client(
      properties.get('streamName'),
      cache.getOrCreate('aws:kinesis', () => new AWS.Kinesis()),
      this.mapper);
  }

  public install(target: Runtime): void {
    this.readWriteData().install(target);
  }

  public readWriteData(): Client<Stream.Client<T>> {
    return this._client(this.grantReadWrite.bind(this.grantReadWrite));
  }

  public readData(): Client<Stream.Client<T>> {
    return this._client(this.grantRead.bind(this.grantRead));
  }

  public writeData(): Client<Stream.Client<T>> {
    return this._client(this.grantWrite.bind(this.writeData));
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

export class ContextualizedStream<T, R extends RuntimeContext> implements IEnumerable<T, R, EnumerateStreamProps> {
  constructor(private readonly stream: Stream<T>, public readonly context: R) {}

  public forBatch(scope: cdk.Construct, id: string, f: (values: T[], clients: Lifted<R>) => Promise<any>, props?: EnumerateStreamProps): lambda.Function {
    props = props || {
      batchSize: 100,
      startingPosition: lambda.StartingPosition.TrimHorizon
    };
    props.executorService = props.executorService || new LambdaExecutorService({
      memorySize: 128,
      timeout: 10
    });
    const lambdaFn = props.executorService.run(scope, id, {
      context: this.context,
      handle: async (event: KinesisEvent, context) => {
        const records = event.Records.map(record => this.stream.mapper.read(new Buffer(record.kinesis.data, 'base64')));
        await f(records, context);
      }
    });
    lambdaFn.addEventSource(new events.KinesisEventSource(this.stream, props));
    return lambdaFn;
  }

  public forEach(scope: cdk.Construct, id: string, f: (value: T, clients: Lifted<R>) => Promise<any>, props?: EnumerateStreamProps): lambda.Function {
    return this.forBatch(scope, id, (values, clients) => Promise.all(values.map(v => f(v, clients))), props);
  }

  public lift<R2 extends RuntimeContext>(context: R2): IEnumerable<T, R & R2, EnumerateStreamProps> {
    return new ContextualizedStream(this.stream, {
      ...this.context,
      ...context
    });
  }
}

export namespace Stream {
  export type PutRecordInput<T> = {Data: T} & Omit<AWS.Kinesis.PutRecordInput, 'Data' | 'StreamName'>;
  export type PutRecordOutput = AWS.Kinesis.PutRecordOutput;
  export type PutRecordsInput<T> = Array<{Data: T} & Omit<AWS.Kinesis.PutRecordsRequestEntry, 'Data'>>;
  export type PutRecordsOutput = AWS.Kinesis.PutRecordsOutput;

  export class Client<T> {
    constructor(
      public readonly streamName: string,
      public readonly client: AWS.Kinesis,
      public readonly mapper: Mapper<T, Buffer>
    ) {}

    public putRecord(request: PutRecordInput<T>): Promise<PutRecordOutput> {
      return this.client.putRecord({
        ...request,
        StreamName: this.streamName,
        Data: this.mapper.write(request.Data)
      }).promise();
    }

    public putRecords(request: PutRecordsInput<T>): Promise<PutRecordsOutput> {
      return this.client.putRecords({
        StreamName: this.streamName,
        Records: request.map(record => ({
          ...record,
          Data: this.mapper.write(record.Data)
        }))
      }).promise();
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
