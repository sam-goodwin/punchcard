import cdk = require('@aws-cdk/cdk');
import { integer, string, struct, Topic, Rate, λ, L, not, HashTable, Json, array, timestamp, Queue, RuntimeShape, RuntimeType, Depends } from 'punchcard';

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

const table = new HashTable(stack, 't', {partitionKey: 'id', shape: { id: string() }});

topic.stream().forEach(stack, 'ForEachNotification', {
  depends: table,
  async handle(value, table) {
    await table.put({
      item: {
        id: 'id'
      }
    });
    console.log(value)
  }
});


// process each SNS notification in Lambda
topic.stream().forEach(stack, 'ForEachNotification', {
  depends: Depends.none,
  async handle(message) {
    console.log(`received notification '${message.key}' with a delay of ${new Date().getTime() - message.timestamp.getTime()}ms`);
  }
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

queue.stream().flatMap({
  // define your dependencies - in this case, we need read access to the enrichments table
  depends: enrichments.readAccess(),
  async handle(message, e) {
    // implement the enrichment procedure - runs in Lambda triggered by SQS
    const enrichment = await e.get(message);

    return [{
      ...message,
      tags: enrichment ? enrichment.tags : []
    }];
  }
});

// Lastly, we'll kick off the whole system with a dummy notification sent once per minute
λ().schedule(stack, 'DummyData', {
  depends: topic,
  rate: Rate.minutes(1),
  handle: async (_, topic) => {
    await topic.publish({
      Message: {
        count: 1,
        key: uuid(),
        timestamp: new Date()
      }
    })
  }
});
