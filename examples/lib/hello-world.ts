import cdk = require('@aws-cdk/core');
import { Schedule } from '@aws-cdk/aws-events';
import { Core, Lambda, DynamoDB, SQS } from 'punchcard';
import { string, integer, Record, MaxLength } from '@punchcard/shape';
import { Dependency } from 'punchcard/lib/core';

import json = require('@punchcard/shape-json');

export const app = new Core.App();
const stack = app.root.map(app => new cdk.Stack(app, 'hello-world'));

/**
 * State of a counter.
 */
class Counter extends Record({

  /**
   * Rate Key documentation goes here.
   */
  key: string
    .apply(MaxLength(1)),
  
  count: integer
}) {}

const hashTable = new DynamoDB.Table(stack, 'Table', Counter, 'key');

const queue = new SQS.Queue(stack, 'queue', {
  shape: Counter
});

// schedule a Lambda function to increment counts in DynamoDB and send SQS messages with each update.
Lambda.schedule(stack, 'MyFunction', {
  schedule: Schedule.rate(cdk.Duration.minutes(1)),
  depends: Dependency.concat(
    hashTable.readWriteAccess(),
    queue.sendAccess()),
}, async(_, [hashTable, queue]) => {
  console.log('Hello, World!');

  let rateType = await hashTable.get('hash key');
  if (rateType === undefined) {
    rateType = new Counter({
      key: 'key',
      count: 0
    })
    await hashTable.put(rateType);
  }

  await queue.sendMessage(rateType);
  await hashTable.update('key', _ => [
    _.count.increment()
  ]);
});

// print out a message for each SQS message received
queue.messages().forEach(stack, 'ForEachMessage', {}, async (msg) => {
  console.log(`received message with key ${msg.key} and count ${msg.count}`);
});

