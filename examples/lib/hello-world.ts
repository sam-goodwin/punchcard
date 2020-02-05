import cdk = require('@aws-cdk/core');
import { Schedule } from '@aws-cdk/aws-events';
import { Core, Lambda, DynamoDB, SQS } from 'punchcard';
import { string, integer, Record } from '@punchcard/shape';
import { Dependency } from 'punchcard/lib/core';

export const app = new Core.App();
const stack = app.stack('hello-world');

/**
 * State of a counter.
 */
class Counter extends Record({
  /**
   * The hash key of the Counter
   */
  key: string,
  /**
   * Integer property for tracking the Counter's count.
   */
  count: integer
}) {}

// create a table to store counts for a key
const hashTable = new DynamoDB.Table(stack, 'Table', {
  data: Counter,
  key: 'key',
});

// index the counters by their value
const counterIndex = hashTable.globalIndex({
  indexName: 'byCounter',
  key: ['count', 'key'],
  projection: Counter
});

const queue = new SQS.Queue(stack, 'queue', {
  shape: Counter
});

// schedule a Lambda function to increment counts in DynamoDB and send SQS messages with each update.
Lambda.schedule(stack, 'MyFunction', {
  schedule: Schedule.rate(cdk.Duration.minutes(1)),
  depends: Dependency.concat(
    hashTable.readWriteAccess(),
    counterIndex.readAccess(),
    queue.sendAccess()),
}, async (_, [hashTable, counterIndex, queue]) => {
  console.log('Hello, World!');

  // lookup the rate type
  let rateType = await hashTable.get('key');
  if (rateType === undefined) {
    rateType = new Counter({
      key: 'key',
      count: 0
    });
    // put it with initial value if it doesn't exist
    await hashTable.put(rateType);
  } 

  // query the counter index to find any counters with the same value
  const otherOfCount = await counterIndex.query(rateType.count);
  for (const other of otherOfCount.Items || []) {
    // print them out - enjoy the automatic de/serialization
    console.log(`also with count=${rateType.count}: ${other.key}`)
  }

  // send the rate type and all other rates with the same count to the SQS queue
  // retries of batches are handled automatically
  await queue.sink([rateType, ...(otherOfCount.Items || [])]);

  // increment the counter by 1
  await hashTable.update('key', {
    actions: _ => [
      _.count.increment()
    ]
  });
});

// print out a message for each SQS message received
queue.messages().forEach(stack, 'ForEachMessage', {}, async (msg) => {
  console.log(`received message with key '${msg.key}' and count ${msg.count}`);
});

