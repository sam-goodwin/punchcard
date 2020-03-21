import { Database } from '@aws-cdk/aws-glue';
import { Construct } from '@aws-cdk/core';
import { StreamEncryption } from '@aws-cdk/aws-kinesis';
import { RecordType, Value } from '@punchcard/shape';
import { Glue, Kinesis, S3 } from 'punchcard';
import { Build } from 'punchcard/lib/core/build';
import { CDK } from 'punchcard/lib/core/cdk';
import { Period, PT1M } from './period';
import { Schema } from './schema';

export interface DataPipelineProps<C extends RecordType, TS extends keyof C> {
  database: Build<Database>;
  // @ts-ignore
  schema: Schema<C, TS>;
}
export class DataPipeline<T extends RecordType, TS extends keyof T> {
  public readonly bucket: S3.Bucket;
  public readonly stream: Kinesis.Stream<T>;
  public readonly table: Glue.Table<T, Period.PT1M>;

  constructor(_scope: Build<Construct>, id: string, props: DataPipelineProps<T, TS>) {
    const scope = CDK.chain(({core}) => _scope.map(scope => new core.Construct(scope, id)));

    this.stream = new Kinesis.Stream(scope, 'Stream', {
      shape: props.schema.shape,
      streamProps: Build.of({
        encryption: StreamEncryption.KMS
      })
    });

    this.bucket = new S3.Bucket(CDK.chain(({s3}) => scope.map(scope => new s3.Bucket(scope, 'Bucket', {
      encryption: s3.BucketEncryption.KMS_MANAGED,
    }))));

    this.table = this.stream
      .toFirehoseDeliveryStream(scope, 'ToS3').objects()
      .toGlueTable(scope, 'ToGlue', {
        bucket: this.bucket.resource,
        database: props.database,
        tableName: props.schema.schemaName,
        columns: props.schema.shape,
        partition: {
          // @ts-ignore
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