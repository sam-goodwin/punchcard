import trail = require('@aws-cdk/aws-cloudtrail');
import { Database } from '@aws-cdk/aws-glue';
import iam = require('@aws-cdk/aws-iam');
import { StreamEncryption } from '@aws-cdk/aws-kinesis';
import s3 = require('@aws-cdk/aws-s3');
import core = require('@aws-cdk/core');

import { BillingMode } from '@aws-cdk/aws-dynamodb';
import { DynamoDB, Glue, Kinesis, Lambda, S3, SNS } from 'punchcard';
import { Dependency } from 'punchcard/lib/core';
import { dynamic, RuntimeShape, string, struct, StructShape } from 'punchcard/lib/shape';
import { Cleaner } from './cleaner';
import { Compactor } from './compactor';
import { DataLake } from './data-lake';
import { Period } from './period';
import { Schema } from './schema';

export interface DataPipelineProps<C extends Glue.Columns, TS extends keyof C> {
  schema: Schema<C, TS>;
  lake: DataLake<any>;
}
export class DataPipeline<C extends Glue.Columns, TS extends keyof C> extends core.Construct {
  public readonly schema: Schema<C, TS>;

  public readonly bucket: S3.Bucket;
  public readonly stream: Kinesis.Stream<StructShape<C>>;
  public readonly stagingBucket: s3.Bucket;

  public readonly minutelyTable: Glue.Table<C, Period.PT1M>;
  public readonly hourlyTable: Glue.Table<C, Period.PT1H>;

  public readonly cleaner: Cleaner<C>;

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
        database: props.lake.database,
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

    // this.cleaner = new Cleaner(this, 'Cleaner', {
    //   source: this.minutelyTable,
    //   lock: props.lake.lock,
    //   schema: props.schema,
    //   scheduleState: props.lake.scheduleState,
    //   deletionRequests: props.lake.deletionRequests
    // });

    const hourlyCompaction = new Compactor(this, 'Compactor', {
      source: this.minutelyTable,
      scheduleState: props.lake.scheduleState,
      schema: props.schema,
      optimalFileSizeMB: 256,
      lock: props.lake.lock
    });
    this.hourlyTable = hourlyCompaction.compacted;

    // DynamoDB Table to permanently track which hours are being compacted
    // we can't rely on Step Functions because they expire after 90 days
    // and we may need to roll over executions to new instances to avoid the 25k history limit
    const compactors = new DynamoDB.Table(this, 'State', {
      partitionKey: 'id',
      attributes: {
        id: string(),
        executionArn: string(),
      },
      billingMode: BillingMode.PAY_PER_REQUEST
    });

    // lambda container-scoped cache to minimize API calls
    const cache: Set<string> = new Set();

    // trigger a machine to monitor each hour of data
    this.minutelyTable.bucket.notifications().forEach(this, 'OnMinuteObject', {
      config: {
        events: [s3.EventType.OBJECT_CREATED],
        filters: [{
          prefix: `${this.minutelyTable.resource.tableName}/`
        }],
        executorService: new Lambda.ExecutorService({
          memorySize: 512
        })
      },
      depends: Dependency.tuple(
        this.minutelyTable,
        hourlyCompaction.machine,
        compactors
      ),
      handle: async (notification, [minutelyTable, compactor, compactors]) => {
        const seen = new Set<string>();
        await Promise.all(notification.Records
          .filter(r => r.s3.object.key.startsWith(minutelyTable.tableName + '/'))
          .map(o => {
            const key = o.s3.object.key;
            let parts = unescape(key).split('/');
            parts = parts.slice(1, parts.length - 1); // drop the table name from the start, and file name from the end
            const partition: any = {};
            for (const part of parts) {
              const [name, value] = part.split('=');
              partition[name] = ((this.minutelyTable.partitionMappers as any)[name]).read(value);
            }
            delete partition.minute; // we only want to trigger compactions for an hourly period
            const id = `${minutelyTable.tableName}:${Object.entries(partition).map(([name, value]) => `${name}=${value}`).join('/')}`;
            const hour = new Date(partition.year, partition.month - 1, partition.day, partition.hour, 0);
            return {
              id,
              hour
            };
          })
          .filter(({id}) => {
            const keep = !seen.has(id);
            seen.add(id);
            return keep;
          })
          .map(async ({id, hour}) => {
            const exists = cache.has(id) || (await compactors.get({id}) !== undefined);
            if (!exists) {
              console.log(`triggering compaction: ${id}`);
              // all errors are fatal
              // if an execution already exists (and the input is the same) then it won't throw an error
              // https://docs.aws.amazon.com/step-functions/latest/apireference/API_StartExecution.html
              const res = await compactor.startExecution({
                name: hour.toISOString().replace(/[:]/g, '_'),
                state: {
                  startTime: hour,
                  globalId: `${id}:compact:hourly`,
                  version: 0,
                  lastCompactTime: new Date(0),
                  shouldCompact: false,
                  shouldTerminate: false,
                  delaySeconds: 60
                }
              });
              await compactors.put({
                item: {
                  id,
                  executionArn: res.executionArn
                }
              });
              cache.add(id);
            } else {
              console.log(`already exists: ${id}`);
            }
          }));
      }
    });
  }
}
