import AWS = require('aws-sdk');

import dynamodb = require('@aws-cdk/aws-dynamodb');

import events = require('@aws-cdk/aws-events');
import iam = require('@aws-cdk/aws-iam');
import sfn = require('@aws-cdk/aws-stepfunctions');
import tasks = require('@aws-cdk/aws-stepfunctions-tasks');
import core = require('@aws-cdk/core');

import moment = require('moment');

import { DynamoDB, Glue, Lambda, SNS, StepFunctions } from 'punchcard';
import { Cache, Dependency, Namespace } from 'punchcard/lib/core';
import { array, ArrayShape, boolean, dynamic, integer, Json, Mapper, optional, RuntimeShape, Shape, string, StringShape, struct, StructShape, timestamp, TimestampFormat } from 'punchcard/lib/shape';
import { ScheduleStateTable } from './data-lake';
import { Lock } from './lock';
import { Period } from './period';
import { Schema } from './schema';

export interface CleanerProps<C extends Glue.Columns> {
  schema: Schema<any, any>;
  source: Glue.Table<C, Period.PT1M>;
  scheduleState: ScheduleStateTable;
  deletionRequests: SNS.Topic<StructShape<{
    requestId: StringShape;
    customerIds: ArrayShape<StringShape>;
  }>>;
  lock: Lock;
}

const deleteState = struct({
  requestId: string(),
  customerIds: array(string()),
  nextToken: optional(string())
});
type State = typeof deleteState;

export class Cleaner<C extends Glue.Columns> extends core.Construct {
  public readonly machine: StepFunctions.StateMachine<State>;

  constructor(scope: core.Construct, id: string, props: CleanerProps<C>) {
    super(scope, id);

    const worker = new Lambda.Function(this, 'Worker', {
      request: struct({
        key: string(),
        customerIds: array(string())
      }),
      response: dynamic,

      memorySize: 3008,
      timeout: core.Duration.minutes(15),

      depends: props.source,
      handle: async (req, table) => {
        const customerIds = new Set(req.customerIds);
        const records = await table.getRecords(req.key);
        const filtered = records.filter(record => !props.schema.shouldDelete!(record, customerIds));

        if (filtered.length < records.length) {
          const obj = await table.serializeRecords(filtered);
          await table.bucket.putObject({
            Key: req.key,
            Body: obj
          });
        }
      }
    });

    const deleteRequest = struct({
      customerIds: array(string()),
    });

    const cleanPartition = new Lambda.Function(this, 'CleanPartition', {
      request: struct(props.source.shape.partitions),

      timeout: core.Duration.minutes(15),
      memorySize: 512,

      depends: Dependency.tuple(props.source, worker),
      handle: async (partition, [source, worker]) => {
        // const startTime = request.startTime;
        // const partition = {
        //   year: startTime.getUTCFullYear(),
        //   month: startTime.getUTCMonth() + 1,
        //   day: startTime.getUTCDate(),
        //   hour: startTime.getUTCHours(),
        //   minute: startTime.getUTCMinutes()
        // };
        const promises: Array<Promise<any>> = [];
        for await (const object of source.listPartition(partition)) {
          promises.push(worker.invoke({
            key: object.Key!,
            customerIds: []
          }));
        }
        await Promise.all(promises);
      }
    });

    // const broker = new Lambda.Function(this, 'Broker', {
    //   request: state,
    //   response: state,
    //   depends: pendingDeletions,

    //   handle: async (state, pendingDeletions) => {
    //     const deletions = await pendingDeletions.scan();

    //     return state;
    //   }
    // });

    // const poll = new sfn.Task(this, 'Poll', {
    //   task: new tasks.RunLambdaTask(broker)
    // });
    // const wait = new sfn.Wait(this, 'Wait', {
    //   time: sfn.WaitTime.duration(core.Duration.minutes(1))
    // });

    // this.machine = new StepFunctions.StateMachine(new sfn.StateMachine(this, 'CleanMachine', {
    //   definition: poll
    //     .next(wait)
    //     .next(poll)
    // }), deleteState);

    // props.deletionRequests.notifications().forEach(this, 'OnDeletionRequest', {
    //   depends: this.machine,
    //   handle: async (item, machine) => {
    //     await machine.startExecution({
    //       name: item.requestId,
    //       state: {
    //         requestId: item.requestId,
    //         customerIds: item.customerIds
    //       }
    //     });
    //   }
    // });
  }
}
