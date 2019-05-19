import iam = require('@aws-cdk/aws-iam');
import kinesis = require('@aws-cdk/aws-kinesis');
import cdk = require('@aws-cdk/cdk');
import AWS = require('aws-sdk');
import { Cache, PropertyBag } from '../property-bag';
import { Client, Runtime } from '../runtime';
import { Mapper } from '../shape';

export interface StreamProps<T> extends kinesis.StreamProps {
  mapper: Mapper<T, Buffer>;
}
export class Stream<T> extends kinesis.Stream implements Client<Stream.Client<T>> {
  private readonly mapper: Mapper<T, Buffer>;

  constructor(scope: cdk.Construct, id: string, props: StreamProps<T>) {
    super(scope, id, props);
    this.mapper = props.mapper;
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
    return this._client(this.writeData.bind(this.writeData));
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

export namespace Stream {
  export class Client<T> {
    constructor(
      public readonly streamName: string,
      public readonly client: AWS.Kinesis,
      public readonly mapper: Mapper<T, Buffer>
    ) {}

    public putRecord(request: {
      data: T;
      partitionKey: string;
      explicitHashKey?: string;
    }): Promise<AWS.Kinesis.PutRecordOutput> {
      return this.client.putRecord({
        StreamName: this.streamName,
        PartitionKey: request.partitionKey,
        ExplicitHashKey: request.explicitHashKey,
        Data: this.mapper.write(request.data)
      }).promise();
    }

    public putRecords(request: {
      records: Array<{
        data: T;
        partitionKey: string;
        explicitHashKey?: string;
      }>
    }): Promise<AWS.Kinesis.PutRecordsOutput> {
      return this.client.putRecords({
        StreamName: this.streamName,
        Records: request.records.map(record => ({
          Data: this.mapper.write(record.data),
          PartitionKey: record.partitionKey,
          ExplicitHashKey: record.explicitHashKey
        }))
      }).promise();
    }
  }
}
