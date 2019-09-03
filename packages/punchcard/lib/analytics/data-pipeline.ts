import { Database } from '@aws-cdk/aws-glue';
import { StreamEncryption } from '@aws-cdk/aws-kinesis';
import s3 = require('@aws-cdk/aws-s3');
import core = require('@aws-cdk/core');
import * as Glue from '../glue';
import { Columns } from '../glue';
import * as Kinesis from '../kinesis';
import * as S3 from '../s3';
import { RuntimeShape, struct, StructShape } from '../shape';
import { DeliveryStream } from './delivery-stream';
import { Period } from './period';
import { Schema } from './schema';

export interface DataPipelineProps<C extends Columns, TS extends keyof C> {
  database: Database;
  schema: Schema<C, TS>;
}
export class DataPipeline<C extends Columns, TS extends keyof C> extends core.Construct {
  public readonly bucket: S3.Bucket;
  public readonly stream: Kinesis.Stream<StructShape<C>>;
  public readonly deliveryStream: DeliveryStream;
  public readonly stagingBucket: s3.Bucket;
  public readonly table: Glue.Table<C, Period.PT1M>;

  constructor(scope: core.Construct, id: string, props: DataPipelineProps<C, TS>) {
    super(scope, id);

    this.stream = new Kinesis.Stream(this, 'Stream', {
      shape: struct(props.schema.shape),
      encryption: StreamEncryption.KMS
    });

    this.bucket = new S3.Bucket(new s3.Bucket(this, 'Bucket', {
      encryption: s3.BucketEncryption.KMS_MANAGED,
    }));

    this.table = this.stream
      .toFirehoseDeliveryStream(this, 'ToS3').objects()
      .toGlueTable(this, 'ToGlue', {
        bucket: this.bucket.bucket,
        database: props.database,
        tableName: props.schema.schemaName,
        columns: props.schema.shape,
        partition: {
          keys: Period.PT1M.schema,
          get(record): RuntimeShape<StructShape<Period.PT1M>> {
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
  }
}