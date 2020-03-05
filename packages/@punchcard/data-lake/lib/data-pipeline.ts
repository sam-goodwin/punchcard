import type { Database } from '@aws-cdk/aws-glue';
import type { Construct } from '@aws-cdk/core';

import { StreamEncryption } from '@aws-cdk/aws-kinesis';
import { RecordType, Value } from '@punchcard/shape';
import { Glue, Kinesis, S3 } from 'punchcard';
import { Build } from 'punchcard/lib/core/build';
import { CDK } from 'punchcard/lib/core/cdk';
import { Period, PT1M } from './period';
import { Schema } from './schema';

export interface DataPipelineProps<C extends RecordType, TS extends keyof C> {
  database: Build<Database>;
  schema: Schema<C, TS>;
}
export class DataPipeline<T extends RecordType, TS extends keyof T> {
  public readonly bucket: S3.Bucket;
  public readonly stream: Kinesis.Stream<T>;
  public readonly table: Glue.Table<T, Period.PT1M>;

  constructor(scope: Build<Construct>, id: string, props: DataPipelineProps<T, TS>) {
    scope = scope.map(scope => new CDK.Core.Construct(scope, id));

    this.stream = new Kinesis.Stream(scope, 'Stream', {
      shape: props.schema.shape,
      streamProps: Build.of({
        encryption: StreamEncryption.KMS
      })
    });

    this.bucket = new S3.Bucket(scope.map(scope => new CDK.S3.Bucket(scope, 'Bucket', {
      encryption: CDK.S3.BucketEncryption.KMS_MANAGED,
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
          get(record: Value.Of<T>): PT1M {
            const ts = props.schema.timestamp(record);
            return new PT1M({
              year: ts.getUTCFullYear(),
              month: ts.getUTCMonth(),
              day: ts.getUTCDate(),
              hour: ts.getUTCHours(),
              minute: ts.getUTCMinutes()
            });
          }
        }
      });
  }
}