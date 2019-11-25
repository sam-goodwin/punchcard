import { Database } from '@aws-cdk/aws-glue';
import { StreamEncryption } from '@aws-cdk/aws-kinesis';
import s3 = require('@aws-cdk/aws-s3');
import core = require('@aws-cdk/core');

import { Glue, Kinesis, S3 } from 'punchcard';

import { Build } from 'punchcard/lib/core/build';
import { RuntimeShape, struct, StructShape } from 'punchcard/lib/shape';
import { Period } from './period';
import { Schema } from './schema';

export interface DataPipelineProps<C extends Glue.Columns, TS extends keyof C> {
  database: Build<Database>;
  schema: Schema<C, TS>;
}
export class DataPipeline<C extends Glue.Columns, TS extends keyof C> {
  public readonly bucket: S3.Bucket;
  public readonly stream: Kinesis.Stream<StructShape<C>>;
  public readonly stagingBucket: s3.Bucket;
  public readonly table: Glue.Table<C, Period.PT1M>;

  constructor(scope: Build<core.Construct>, id: string, props: DataPipelineProps<C, TS>) {
    scope = scope.map(scope => new core.Construct(scope, id));
    // super(scope, id);

    this.stream = new Kinesis.Stream(scope, 'Stream', {
      shape: struct(props.schema.shape),
      encryption: StreamEncryption.KMS
    });

    this.bucket = new S3.Bucket(scope.map(scope => new s3.Bucket(scope, 'Bucket', {
      encryption: s3.BucketEncryption.KMS_MANAGED,
    })));

    this.table = this.stream
      .toFirehoseDeliveryStream(scope, 'ToS3').objects()
      .toGlueTable(scope, 'ToGlue', {
        bucket: this.bucket.resource,
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