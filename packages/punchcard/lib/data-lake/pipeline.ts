import { Database } from '@aws-cdk/aws-glue';
import { StreamEncryption } from '@aws-cdk/aws-kinesis';
import s3 = require('@aws-cdk/aws-s3');
import core = require('@aws-cdk/core');
import { Kinesis } from '../enumerable';
import { RuntimeShape, Shape, struct, StructType, TimestampType } from '../shape';
import { Glue } from '../storage/glue';
import { DeliveryStream } from './delivery-stream';
import { Period } from './period';
import { Schema } from './schema';

export type TimeSeriesData = Shape & { timestamp: TimestampType; };

export interface DataPipelineProps<S extends Shape, T extends keyof S> {
  database: Database;
  schema: Schema<S, T>;
}
export class DataPipeline<S extends Shape, T extends keyof S> extends core.Construct {
  public readonly stream: Kinesis.Stream<StructType<S>>;
  public readonly deliveryStream: DeliveryStream;
  public readonly stagingBucket: s3.Bucket;
  public readonly table: Glue.Table<S, Period.PT1M>;

  constructor(scope: core.Construct, id: string, props: DataPipelineProps<S, T>) {
    super(scope, id);

    this.stream = new Kinesis.Stream(this, 'Stream', {
      type: struct(props.schema.shape),
      encryption: StreamEncryption.KMS
    });

    this.table = this.stream
      .toS3(this, 'ToS3').enumerable()
      .toGlueTable(this, 'ToGlue', {
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
  }
}