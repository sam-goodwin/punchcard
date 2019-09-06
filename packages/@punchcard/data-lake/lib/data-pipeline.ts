import { Database } from '@aws-cdk/aws-glue';
import iam = require('@aws-cdk/aws-iam');
import { StreamEncryption } from '@aws-cdk/aws-kinesis';
import s3 = require('@aws-cdk/aws-s3');
import core = require('@aws-cdk/core');

import { Glue, Kinesis, S3 } from 'punchcard';
import { RuntimeShape, struct, StructShape } from 'punchcard/lib/shape';
import { Compactor } from './compactor';
import { ScheduleStateTable } from './data-lake';
import { Period } from './period';
import { Schema } from './schema';

export interface DataPipelineProps<C extends Glue.Columns, TS extends keyof C> {
  database: Database;
  schema: Schema<C, TS>;
  scheduleState: ScheduleStateTable;
}
export class DataPipeline<C extends Glue.Columns, TS extends keyof C> extends core.Construct {
  public readonly schema: Schema<C, TS>;

  public readonly bucket: S3.Bucket;
  public readonly stream: Kinesis.Stream<StructShape<C>>;
  public readonly stagingBucket: s3.Bucket;

  public readonly minutelyTable: Glue.Table<C, Period.PT1M>;
  public readonly hourlyTable: Glue.Table<C, Period.PT1H>;

  constructor(scope: core.Construct, id: string, props: DataPipelineProps<C, TS>) {
    super(scope, id);

    this.schema = props.schema;
    this.stream = new Kinesis.Stream(this, 'Stream', {
      shape: struct(props.schema.shape),
      encryption: StreamEncryption.KMS
    });

    this.bucket = new S3.Bucket(new s3.Bucket(this, 'Bucket', {
      encryption: s3.BucketEncryption.KMS
    }));
    this.bucket.bucket.encryptionKey!.grantDecrypt(new iam.AccountRootPrincipal());

    this.minutelyTable = this.stream
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
              month: ts.getUTCMonth() + 1,
              day: ts.getUTCDate(),
              hour: ts.getUTCHours(),
              minute: ts.getUTCMinutes()
            };
          }
        }
      });

    this.hourlyTable = new Compactor(this, 'Compactor', {
      source: this.minutelyTable,
      scheduleState: props.scheduleState,
      schema: props.schema,
      optimalFileSizeMB: 256
    }).compacted;
  }
}
