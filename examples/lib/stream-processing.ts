import cdk = require('@aws-cdk/cdk');
import { integer, string, struct, Topic, Rate, λ, L, not, HashTable, Json, array, timestamp, Queue, RuntimeShape, RuntimeType } from 'punchcard';

import uuid = require('uuid');

const app = new cdk.App();
export default app;
const stack = new cdk.Stack(app, 'stack');

// create a strongly-typed SNS Topic
const topic = new Topic(stack, 'Topic', {
  type: struct({
    key: string(),
    count: integer(),
    timestamp
  })
});

// process each SNS notification in Lambda
topic.stream().forEach(stack, 'ForEachNotification', async message => {
  console.log(`received notification '${message.key}' with a delay of ${new Date().getTime() - message.timestamp.getTime()}ms`);
});

// you can also perform pre-processing on notifications before collecting in a SQS Queue
const timestampQueue: Queue<Date> = topic.stream()
  .map(async message => message.timestamp)
  .toQueue(stack, 'TimestampQueue', {
    type: timestamp
  });

// subscribe topic to a new SQS Queue
const queue = topic.toQueue(stack, 'Queue');

// create a table to store enrichments
const enrichments = new HashTable(stack, 'Enrichments', {
  partitionKey: 'key',
  shape: {
    key: string(),
    tags: array(string())
  }
});

const enrichedStream = queue
  .clients({
    // name and define your dependencies - in this case, we need read access to the enrichments table
    enrichments: enrichments.readAccess()
  })
  .flatMap(async (values, {enrichments}) => {
    // implement the enrichment procedure - runs in Lambda triggered by SQS
    return await Promise.all(values.map(async value => {
      const enrichment = await enrichments.get(value);
      return {
        ...value,
        tags: enrichment ? enrichment.tags : []
      };
    }))
  }) // collect in a Kinesis Stream
  .toStream(stack, 'Stream', {
    type: topic.type
  });

// Lastly, we'll kick off the whole system with a dummy notification sent once per minute
λ().schedule(stack, 'DummyData', {
  clients: {
    topic
  },
  rate: Rate.minutes(1),
  handle: async (_, {topic}) => {
    await topic.publish({
      Message: {
        count: 1,
        key: uuid(),
        timestamp: new Date()
      }
    })
  }
});
