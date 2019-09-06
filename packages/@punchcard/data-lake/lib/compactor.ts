import AWS = require('aws-sdk');

import events = require('@aws-cdk/aws-events');
import iam = require('@aws-cdk/aws-iam');
import sfn = require('@aws-cdk/aws-stepfunctions');
import tasks = require('@aws-cdk/aws-stepfunctions-tasks');
import core = require('@aws-cdk/core');

import moment = require('moment');

import { Glue, Lambda } from 'punchcard';
import { Cache, Dependency, Namespace } from 'punchcard/lib/core';
import { array, boolean, dynamic, integer, Json, Mapper, RuntimeShape, Shape, string, struct, timestamp } from 'punchcard/lib/shape';
import { ScheduleStateTable } from './data-lake';
import { Lock } from './lock';
import { Period } from './period';
import { Schema } from './schema';

const hourMilliseconds = 60 * 60 * 1000;

type Partitions = Glue.Table.GetPartitionsResponse<Period.PT1M>['Partitions'];

export interface CompactorProps<C extends Glue.Columns> {
  schema: Schema<C, any>;
  source: Glue.Table<C, Period.PT1M>;
  scheduleState: ScheduleStateTable;
  optimalFileSizeMB: number;
  lock: Lock;
}

export class Compactor<C extends Glue.Columns> extends core.Construct {
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
      globalId: string(),
      version: integer(),
      delaySeconds: integer(),
      startTime: timestamp,
      lastCompactTime: timestamp,
      shouldCompact: boolean,
      shouldTerminate: boolean
    });

    const freshnessChecker = new Lambda.Function(this, 'FreshnessChecker', {
      request: state,
      response: state,
      depends: this.source.readAccess(),
      timeout: core.Duration.minutes(1),
      memorySize: 512,
      handle: async (state, source) => {
        const lastCompactTime = new Date();
        const partition = {
          year: state.startTime.getUTCFullYear(),
          month: state.startTime.getUTCMonth() + 1,
          day: state.startTime.getUTCDate(),
          hour: state.startTime.getUTCHours()
        };
        const shouldCompact = await isStale();
        // double back-off if we don't need to compact
        // drop to 1 minute wait if we do
        const delaySeconds = shouldCompact ? 60 : state.delaySeconds * 2;
        const age = (new Date().getTime() - state.startTime.getTime());

        return {
          ...state,
          shouldCompact,
          lastCompactTime,
          // terminate after 6 months
          shouldTerminate: age >= (6 * 30 * 24 * 60 * 60 * 1000),
          // wait a max of 1 hour
          delaySeconds: age < 60 * 60 * 1000 ? 60 : Math.min(60 * 60 /* 1 hour */, delaySeconds)
        };

        async function isStale(nextToken?: string): Promise<boolean> {
          const { NextToken, Partitions } = await source.getPartitions({
            Expression: `(year = ${partition.year}) and (month = ${partition.month}) and (day = ${partition.day}) and (hour = ${partition.hour})`,
            NextToken: nextToken,
            MaxResults: 60
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

    const deleteWorker = new Lambda.Function(this, 'DeleteWorker', {
      request: string(),
      response: dynamic,
      memorySize: 512,
      timeout: core.Duration.minutes(15),
      depends: this.compacted.bucket,
      handle: async (req, compacted) => {
        const promises: Array<Promise<any>> = [];
        for await (const response of (compacted.listObjectsV2({Prefix: req}))) {
           promises.push(Promise.all(response.Contents!.map(o => {
             console.log('deleting', o);
             return compacted.deleteObject({Key: o.Key!});
           })));
        }
        await Promise.all(promises);
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
      depends: Dependency.tuple(this.source, this.compacted, worker, props.lock, deleteWorker),
      handle: async (state, [source, compacted, compactWorker, lock, deleteWorker]) => {
        const expiry = moment().add(15, 'minutes').toDate();

        const partition = {
          year: state.startTime.getUTCFullYear(),
          month: state.startTime.getUTCMonth() + 1,
          day: state.startTime.getUTCDate(),
          hour: state.startTime.getUTCHours()
        };
        const path = compacted.pathFor(partition) + `${state.version}/`;

        try {
          await acquireLock();
          const partitions = await getPartitions();
          const objects = await getObjectsOrderedBySize(partitions);
          await compactObjects(objects);
          await flipPartition();
          await deleteOldData();
          await releaseLock();

          return {
            ...state,
            version: state.version + 1,
            shouldCompact: false
          };
        } catch (err) {
          console.error(err);
          try {
            await releaseLock();
          } catch (err) {
            console.error(err);
          }
          throw err;
        }

        async function acquireLock() {
          await Promise.all([
            lock.acquire({
              tableName: source.tableName,
              hour: state.startTime,
              expiry,
              owner: state.globalId
            }),
            lock.acquire({
              tableName: compacted.tableName,
              hour: state.startTime,
              expiry,
              owner: state.globalId
            })
          ]);
        }

        async function releaseLock() {
          await Promise.all([
            lock.release({
              tableName: source.tableName,
              hour: state.startTime,
              owner: state.globalId
            }),
            lock.release({
              tableName: compacted.tableName,
              hour: state.startTime,
              owner: state.globalId
            })
          ]);
        }

        async function getPartitions(nextToken?: string): Promise<Partitions> {
          const { NextToken, Partitions } = await source.getPartitions({
            Expression: `(year = ${partition.year}) and (month = ${partition.month}) and (day = ${partition.day}) and (hour = ${partition.hour})`,
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
          })))
            .reduce((a, b) => a.concat(b))
            .sort((o1, o2) => (o1.Size || 0) - (o2.Size || 0));
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
          try {
            await compacted.updatePartition({
              Partition: partition,
              UpdatedPartition: {
                LastAccessTime: new Date(),
                Partition: partition,
                Location: path
              }
            });
          } catch (err) {
            if (err.code !== 'EntityNotFoundException') {
              throw err;
            }
            await compacted.createPartition({
              Partition: partition,
              LastAccessTime: new Date(),
              Location: path
            });
          }
        }

        async function deleteOldData() {
          const promises: Array<Promise<any>> = [];
          for await (const listResponse of compacted.bucket.listObjectsV2({Prefix: compacted.pathFor(partition), Delimiter: '/'})) {
            if (listResponse.CommonPrefixes) {
              const deleteOldPrefixes = Promise.all(listResponse.CommonPrefixes
                .filter(p => {
                  const partitionVersion = p.Prefix!.split('/').slice(-2, -1)[0];
                  const shouldDelete = partitionVersion !== state.version.toString();
                  console.log('shouldDelete', p.Prefix, shouldDelete);
                  return shouldDelete;
                })
                .map(prefix => deleteWorker.invoke(prefix.Prefix!)));
              promises.push(deleteOldPrefixes);
            }
          }
          await Promise.all(promises);
        }
      }
    });

    const checkFreshess = new sfn.Task(this, 'CheckFreshnessTask', {
      task: new tasks.InvokeFunction(freshnessChecker)
    });

    const compactPartition: sfn.Task = new sfn.Task(this, 'CompactTask', {
      task: new tasks.InvokeFunction(broker)
    });

    const retry = new sfn.Wait(this, 'Wait', {
      time: sfn.WaitTime.secondsPath('$.delaySeconds'),
    }).next(checkFreshess);

    const compactorMachine = new StateMachine(new sfn.StateMachine(this, 'Compactor', {
      definition: checkFreshess.next(new sfn.Choice(this, 'CompactOrWait')
        .when(sfn.Condition.booleanEquals('$.shouldTerminate', true), new sfn.Succeed(this, 'Success'))
        .when(sfn.Condition.booleanEquals('$.shouldCompact', true), compactPartition.next(retry))
        .otherwise(retry))
    }), state);

    Lambda.schedule(this, 'Scheduler', {
      timeout: core.Duration.seconds(30),
      schedule: events.Schedule.rate(core.Duration.minutes(1)),

      depends: Dependency.tuple(
        this.source.readAccess(),
        props.scheduleState,
        compactorMachine),

      handle: async (_, [table, scheduleStore, compactorMachine], context) => {
        const scheduleState = await getState();
        let nextTime = scheduleState.nextTime;
        do {
          if (nextTime.getTime() < new Date().getTime()) {
            await triggerCompaction(nextTime);
            await updateState(nextTime);
            nextTime = new Date(nextTime.getTime() + hourMilliseconds);
          } else {
            break;
          }
        } while (context.getRemainingTimeInMillis() >= 2000);

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

        async function triggerCompaction(nextTime: Date): Promise<void> {
          const name = nextTime.toISOString().replace(/[:\.-]/g, '_');
          await compactorMachine.startExecution({
            name,
            state: {
              globalId: `${table.tableName}:compactor:${name}`,
              version: 0,
              lastCompactTime: new Date(0),
              shouldCompact: false,
              startTime: nextTime,
              shouldTerminate: false,
              delaySeconds: 60
            }
          });
        }

        async function updateState(time: Date) {
          try {
            await scheduleStore.update({
              key: {
                id: table.tableName
              },
              actions: item => [
                item.nextTime.incrementMs(hourMilliseconds)
              ],
              if: item => item.nextTime.equals(time)
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