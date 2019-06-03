import { Database } from '@aws-cdk/aws-glue';
import { StreamEncryption } from '@aws-cdk/aws-kinesis';
import s3 = require('@aws-cdk/aws-s3');
import cdk = require('@aws-cdk/cdk');
import { Stream } from '../enumerable';
import { RuntimeShape, Shape, struct, StructType, TimestampType } from '../shape';
import { Compression } from '../storage/glue/compression';
import { Period } from '../storage/glue/period';
import { Table } from '../storage/glue/table';
import { DeliveryStream, DeliveryStreamDestination, DeliveryStreamType } from './delivery-stream';
import { Partitioner } from './partitioner';
import { Schema } from './schema';
import { Validator } from './validator';

export type TimeSeriesData = Shape & { timestamp: TimestampType; };

export interface DataPipelineProps<S extends Shape, T extends keyof S> {
  database: Database;
  schema: Schema<S, T>;
}
export class DataPipeline<S extends Shape, T extends keyof S> extends cdk.Construct {
  public readonly stream: Stream<StructType<S>>;
  public readonly deliveryStream: DeliveryStream;
  public readonly stagingBucket: s3.Bucket;
  public readonly validator: Validator<S>;
  public readonly table: Table<S, Period.PT1M>;
  public readonly partitioner: Partitioner<S, Period.PT1M>;

  constructor(scope: cdk.Construct, id: string, props: DataPipelineProps<S, T>) {
    super(scope, id);

    this.stream = new Stream(this, 'Stream', {
      type: struct(props.schema.shape),
      encryption: StreamEncryption.Kms
    });
    this.stream.toS3(this, 'ToS3');

    const [table, sink] = this.stream.toGlue(this, 'ToGlue', {
      database: props.database,
      tableName: props.schema.schemaName,
      columns: props.schema.shape,
      partition: {
        keys: Period.PT1M.schema,
        get(record): RuntimeShape<Period.PT1M> {
          const ts = props.schema.timestamp(record);
          return {
            year: ts.getUTCFullYear(),
            month: ts.getUTCMonth(),
            day: ts.getUTCDate(),
            hour: ts.getUTCHours(),
            minute: ts.getUTCMinutes()
          };
        }
      }
    });
    this.table = table;

    // this.stagingBucket = new s3.Bucket(this, 'StagingBucket', {
    //   encryption: s3.BucketEncryption.Kms
    // });

    // this.validator = new Validator(this, 'Validator', {
    //   table: this.table
    // });
    // this.deliveryStream = new DeliveryStream(this, 'DeliveryStream', {
    //   compression: Compression.Gzip.type,
    //   transformFunction: this.validator.processor,
    //   kinesisStream: this.stream.resource,
    //   destination: DeliveryStreamDestination.S3,
    //   type: DeliveryStreamType.KinesisStreamAsSource,
    //   s3Bucket: this.stagingBucket,
    //   s3Prefix: this.table.s3Prefix
    // });

    // this.partitioner = new Partitioner(this, 'Partitioner', {
    //   table: this.table,
    //   sourceBucket: this.stagingBucket,
    //   sourceCompression: Compression.Gzip
    // });
  }
}