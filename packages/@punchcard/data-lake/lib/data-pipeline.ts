import type { Database } from '@aws-cdk/aws-glue';
import type { Construct } from '@aws-cdk/core';

import { StreamEncryption } from '@aws-cdk/aws-kinesis';
import { TypeShape, Value } from '@punchcard/shape';
import { ElasticSearch, Glue, Kinesis, S3 } from 'punchcard';
import { Build } from 'punchcard/lib/core/build';
import { CDK } from 'punchcard/lib/core/cdk';
import { IndexSettings } from 'punchcard/lib/elasticsearch';
import type { DataLake } from './data-lake';
import { Period, PT1M } from './period';
import { Schema } from './schema';

export interface DataPipelineProps<T extends TypeShape, TS extends keyof T['Members'], ID extends keyof T['Members']> {
  schema: Schema<T, TS, ID>;
  indexSettings?: IndexSettings;
}
export class DataPipeline<T extends TypeShape, TS extends keyof T['Members'], ID extends keyof T['Members']> {
  public readonly bucket: S3.Bucket;
  public readonly stream: Kinesis.Stream<T>;
  public readonly table: Glue.Table<T, Period.PT1M>;
  public readonly index: ElasticSearch.Index<T, ID>;

  constructor(public readonly dataLake: DataLake, id: string, props: DataPipelineProps<T, TS, ID>) {
    const scope = CDK.chain(({core}) => dataLake.database.map(dataLake => new core.Construct(dataLake, id)));

    this.stream = new Kinesis.Stream(scope, 'Stream', {
      shape: props.schema.shape,
      streamProps: Build.of({
        encryption: StreamEncryption.KMS
      })
    });

    this.index = dataLake.domain.addIndex({
      _id: props.schema.id,
      indexName: props.schema.schemaName,
      mappings: props.schema.shape,
      settings: props.indexSettings || {
        number_of_shards: 1
      }
    });

    this.bucket = new S3.Bucket(CDK.chain(({s3}) => scope.map(scope => new s3.Bucket(scope, 'Bucket', {
      encryption: s3.BucketEncryption.KMS_MANAGED,
    }))));

    this.table = this.stream
      .toFirehoseDeliveryStream(scope, 'ToS3').objects()
      .toGlueTable(scope, 'ToGlue', {
        bucket: this.bucket.resource,
        database: dataLake.database,
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