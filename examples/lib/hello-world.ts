import cdk = require('@aws-cdk/core');
import { Schedule } from '@aws-cdk/aws-events';
import { Core, Lambda, DynamoDB, SQS } from 'punchcard';
import { string, integer, Record } from '@punchcard/shape';
import { Dependency } from 'punchcard/lib/core';
import { MaxLength } from '../../packages/@punchcard/shape-validation/lib';

import json = require('@punchcard/shape-json');

export const app = new Core.App();
const stack = app.root.map(app => new cdk.Stack(app, 'hello-world'));

/**
 * Rate
 */
class RateType extends Record({

  /**
   * Rate Key documentation goes here.
   */
  key: string
    .apply(MaxLength(1)),
  
  rating: integer
}) {}

const hashTable = new DynamoDB.Table(stack, 'Table', RateType, 'key');

const sortedTable = new DynamoDB.Table(stack, 'Table', RateType, ['key', 'rating']);

Lambda.schedule(stack, 'MyFunction', {
  schedule: Schedule.rate(cdk.Duration.minutes(1)),
  depends: Dependency.concat(
    hashTable.readWriteAccess(),
    sortedTable.readAccess()),
}, async(_, [hashTable, sortedTable]) => {
  console.log('Hello, World!');

  const hashItem = await hashTable.get('hash key');
  const sortedItem = await sortedTable.get(['hash key', 1]);
});


const queue = new SQS.Queue(stack, 'queue', {
  mapper: json.stringifyMapper(RateType)
});

queue.messages().forEach(stack, 'ForEachMessage', {}, async (e) => {
  e.key.length;
});


