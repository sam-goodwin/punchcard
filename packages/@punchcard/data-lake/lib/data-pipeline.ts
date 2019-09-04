import AWS = require('aws-sdk');

import events = require('@aws-cdk/aws-events');
import { Database } from '@aws-cdk/aws-glue';
import iam = require('@aws-cdk/aws-iam');
import { StreamEncryption } from '@aws-cdk/aws-kinesis';
import s3 = require('@aws-cdk/aws-s3');
import sfn = require('@aws-cdk/aws-stepfunctions');
import tasks = require('@aws-cdk/aws-stepfunctions-tasks');
import core = require('@aws-cdk/core');

import { Glue, Kinesis, Lambda, S3 } from 'punchcard';
import { Cache, Dependency, Namespace } from 'punchcard/lib/core';
import { array, boolean, dynamic, integer, Json, Mapper, RuntimeShape, Shape, string, struct, StructShape, timestamp } from 'punchcard/lib/shape';
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
              month: ts.getUTCMonth(),
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

interface CompactorProps<C extends Glue.Columns> {
  schema: Schema<C, any>;
  source: Glue.Table<C, Period.PT1M>;
  scheduleState: ScheduleStateTable;
  optimalFileSizeMB: number;
}
class Compactor<C extends Glue.Columns> extends core.Construct {
  public readonly source: Glue.Table<C, Period.PT1M>;
  public readonly compacted: Glue.Table<C, Period.PT1H>;

  constructor(scope: core.Construct, id: string, props: CompactorProps<C>) {
    super(scope, id);

    this.source = props.source;
    this.compacted = new Glue.Table(this, 'Compacted', {
      database: this.source.resource.database,
      tableName: `${this.source.resource.tableName}_hourly`,
      bucket: this.source.bucket.bucket,
      columns: this.source.shape.columns,
      partition: {
        keys: Period.PT1H.schema,
        get: event => {
          const p = this.source.partition(event);
          delete p.minute;
          return p;
        }
      }
    });

    const state = struct({
      version: integer({
        minimum: 0
      }),
      startTime: timestamp,
      lastCompactTime: timestamp,
      shouldCompact: boolean
    });

    const freshnessCheker = new Lambda.Function(this, 'FreshnessChecker', {
      request: state,
      response: state,
      depends: this.source.readAccess(),
      timeout: core.Duration.minutes(1),
      handle: async (state, source) => {
        const lastCompactTime = new Date();
        const partition = {
          year: state.startTime.getUTCFullYear(),
          month: state.startTime.getUTCMonth(),
          day: state.startTime.getUTCDate(),
          hour: state.startTime.getUTCHours()
        };
        return {
          ...state,
          shouldCompact: await isStale(),
          lastCompactTime
        };

        async function isStale(nextToken?: string): Promise<boolean> {
          const { NextToken, Partitions } = await source.getPartitions({
            Expression: `(year = ${partition.year}) and (month = ${partition.month}) and (day = ${partition.year}) and (hour = ${partition.hour})`,
            NextToken: nextToken
          });
          if (Partitions.findIndex(p => p.LastAccessTime!.getTime() > state.lastCompactTime.getTime()) !== -1) {
            return true;
          } else if (!NextToken) {
            return false;
          } else {
            return await isStale(NextToken);
          }
        }
      }
    });

    const worker = new Lambda.Function(this, 'Worker', {
      request: struct({
        objects: array(string()),
        to: string()
      }),
      response: dynamic,

      memorySize: 3008,
      timeout: core.Duration.minutes(15),

      depends: Dependency.tuple(
        this.source.readAccess(),
        this.compacted.writeAccess()),

      handle: async (req, [source, dest]) => {
        const records = (await Promise
          .all(req.objects.map(key => source.getRecords(key))))
          .reduce((a, b) => a.concat(b));

        await dest.putRecords(req.to, records);
      }
    });

    const broker = new Lambda.Function(this, 'Broker', {
      request: state,
      response: state,
      timeout: core.Duration.minutes(15),
      memorySize: 1024,
      depends: Dependency.tuple(this.source, this.compacted, worker),
      handle: async (state, [source, compacted, compactWorker]) => {
        const partition = {
          year: state.startTime.getUTCFullYear(),
          month: state.startTime.getUTCMonth(),
          day: state.startTime.getUTCDate(),
          hour: state.startTime.getUTCHours()
        };
        const path = compacted.pathFor(partition) + `${state.version}/`;

        const partitions = await getPartitions();
        const objects = await getObjectsOrderedBySize(partitions);
        await compactObjects(objects);
        await flipPartition();
        await deleteOldData();

        return {
          ...state,
          version: state.version + 1,
          shouldCompact: false
        };

        async function getPartitions(nextToken?: string): Promise<Partitions> {
          const { NextToken, Partitions } = await source.getPartitions({
            Expression: `(year = ${partition.year}) and (month = ${partition.month}) and (day = ${partition.year}) and (hour = ${partition.hour})`,
            NextToken: nextToken
          });
          if (!NextToken) {
            return Partitions;
          } else {
            return Partitions.concat(await getPartitions(NextToken));
          }
        }

        async function getObjectsOrderedBySize(partitions: Partitions): Promise<AWS.S3.Object[]> {
          return (await Promise.all(partitions.map(async partition => {
            const objects: AWS.S3.Object[] = [];
            for await (const object of source.listPartition(partition.Values)) {
              objects.push(object);
            }
            return objects;
          }))).reduce((a, b) => a.concat(b)).sort((o1, o2) => (o1.Size || 0)! - (o2.Size || 0)!);
        }

        async function compactObjects(objects: AWS.S3.Object[]) {
          const futures: Array<Promise<any>> = [];
          const batch: AWS.S3.Object[] = [];

          let size = 0;
          for (const object of objects) {
            batch.push(object);
            size += (object.Size || 0);
            if (size >= props.optimalFileSizeMB * 1024 * 1024) {
              compact();
              batch.splice(0);
              size = 0;
            }
          }
          if (batch) {
            compact();
          }

          await Promise.all(futures);

          function compact() {
            futures.push(compactWorker.invoke({
              objects: batch.map(o => o.Key!),
              to: path
            }));
          }
        }

        async function flipPartition() {
          await compacted.updatePartition({
            Partition: partition,
            UpdatedPartition: {
              LastAccessTime: new Date(),
              Partition: partition,
              Location: path
            }
          });
        }

        async function deleteOldData() {
          console.log('TODO: delete old data');
        }
      }
    });

    const checkFreshess = new sfn.Task(this, 'CheckFreshnessTask', {
      task: new tasks.InvokeFunction(freshnessCheker)
    });

    const compactPartition: sfn.Task = new sfn.Task(this, 'CompactTask', {
      task: new tasks.InvokeFunction(broker)
    });

    const retry = new sfn.Wait(this, 'Wait', {
      time: sfn.WaitTime.duration(core.Duration.minutes(1)),
    }).next(checkFreshess);

    const compactorMachine = new StateMachine(new sfn.StateMachine(this, 'Compactor', {
      definition: checkFreshess.next(new sfn.Choice(this, 'CompactOrWait')
        .when(sfn.Condition.booleanEquals('$.shouldCompact', true), compactPartition.next(retry))
        .otherwise(retry))
    }), state);

    Lambda.schedule(this, 'Scheduler', {
      schedule: events.Schedule.rate(core.Duration.minutes(1)),

      depends: Dependency.tuple(
        this.source.readAccess(),
        props.scheduleState,
        compactorMachine),

      handle: async (_, [table, scheduleStore, compactorMachine]) => {
        const scheduleState = await getState();

        if (scheduleState.nextTime.getTime() < new Date().getTime()) {
          await triggerCompaction();
          await updateState();
        }

        async function getState() {
          let state = await get();
          if (!state) {
            state = {
              id: table.tableName,
              nextTime: props.schema.dataAsOf
            };
            try {
              await scheduleStore.put({
                item: state,
                if: item => item.id.isNotSet()
              });
            } catch (err) {
              if (err.code === 'ConditionalCheckFailedException') {
                state = await get();
              } else {
                throw err;
              }
            }
          }
          return state!;

          function get() {
            return scheduleStore.get({
              id: table.tableName
            });
          }
        }

        async function triggerCompaction(): Promise<void> {
          await compactorMachine.startExecution({
            name: scheduleState.nextTime.toISOString(),
            state: {
              version: 0,
              lastCompactTime: new Date(0),
              shouldCompact: false,
              startTime: scheduleState.nextTime,
            }
          });
        }

        async function updateState() {
          try {
            await scheduleStore.update({
              key: {
                id: table.tableName
              },
              actions: item => [
                item.nextTime.incrementMs(hourMilliseconds)
              ],
              if: item => item.nextTime.equals(scheduleState!.nextTime)
            });
          } catch (err) {
            if (err.code !== 'ConditionalCheckFailedException') {
              throw err;
            }
          }
        }
      }
    });
  }
}

const hourMilliseconds = 60 * 60 * 1000;

type Partitions = Glue.Table.GetPartitionsResponse<Period.PT1M>['Partitions'];

class StateMachine<S extends Shape<any>> implements Dependency<StateMachineClient<RuntimeShape<S>>> {
  constructor(private readonly machine: sfn.StateMachine, private readonly shape: S) {}
  public install(namespace: Namespace, grantable: iam.IGrantable): void {
    namespace.set('stateMachineArn', this.machine.stateMachineArn);
    this.machine.grantStartExecution(grantable);
  }

  public async bootstrap(namespace: Namespace, cache: Cache): Promise<StateMachineClient<RuntimeShape<S>>> {
    return new StateMachineClient(
      cache.getOrCreate('aws:stepfunctions', () => new AWS.StepFunctions()),
      namespace.get('stateMachineArn'),
      Json.forShape(this.shape));
  }

}
class StateMachineClient<S> {
  constructor(
    public readonly client: AWS.StepFunctions,
    public readonly stateMachineArn: string,
    public readonly mapper: Mapper<S, string>,
  ) {}

  public startExecution(props: {
    name: string;
    state: S
  }): Promise<AWS.StepFunctions.StartExecutionOutput> {
    return this.client.startExecution({
      stateMachineArn: this.stateMachineArn,
      input: this.mapper.write(props.state),
      name: props.name
    }).promise();
  }
}