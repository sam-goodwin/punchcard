import AWS = require('aws-sdk');

import dynamodb = require('@aws-cdk/aws-dynamodb');
import events = require('@aws-cdk/aws-events');
import iam = require('@aws-cdk/aws-iam');
import sfn = require('@aws-cdk/aws-stepfunctions');
import tasks = require('@aws-cdk/aws-stepfunctions-tasks');
import core = require('@aws-cdk/core');

import moment = require('moment');

import { DynamoDB, Glue, Lambda, SNS } from 'punchcard';
import { Cache, Dependency, Namespace } from 'punchcard/lib/core';
import { array, boolean, dynamic, integer, Json, Mapper, RuntimeShape, Shape, string, StringShape, struct, StructShape, timestamp } from 'punchcard/lib/shape';
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
    customerId: StringShape;
  }>>;
  lock: Lock;
}

export class Cleaner<C extends Glue.Columns> extends core.Construct {
  constructor(scope: core.Construct, id: string, props: CleanerProps<C>) {
    super(scope, id);

    const pendingDeletions = new DynamoDB.Table(this, 'Deletions', {
      partitionKey: 'requestId',
      attributes: {
        requestId: string(),
        customerId: string()
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    props.deletionRequests.notifications().forEach(this, 'OnDeletionRequest', {
      depends: pendingDeletions.writeAccess(),
      handle: async (item, table) => {
        await table.put({item});
      }
    });

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

    const state = struct({
      nextToken: string()
    });

    const broker = new Lambda.Function(this, 'Broker', {
      request: state,
      response: state,
      depends: pendingDeletions,

      handle: async (state, pendingDeletions) => {
        const deletions = await pendingDeletions.scan();

        return state;
      }
    });
  }
}
