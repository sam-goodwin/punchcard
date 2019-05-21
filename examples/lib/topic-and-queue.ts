import AWS = require('aws-sdk');

import cdk = require('@aws-cdk/cdk');
import { integer, Json, Queue, string, struct, Topic, HashTable, attribute_not_exists, attribute_exists, LambdaExecutorService, Rate } from 'punchcard';

const app = new cdk.App();
export default app;

const stack = new cdk.Stack(app, 'topic-and-queue');

// structure of notifications
const Message = struct({
  key: string(),
  count: integer()
});

const topic = new Topic(stack, 'Topic', {
  mapper: Json.forType(Message) // serialize notifications with JSON
});
// SNS -> Lambda
topic.forEach(stack, 'OnNotification', async event => {
  // do something on each notification
  // (runs in an AWS Lambda Function)
  console.log(event.key, event.count);
});

const queue = new Queue(stack, 'Queue', {
  mapper: Json.forType(Message) // shape of data must match the Topic, i.e. that described by `Message`
});
// SNS -> SQS
topic.subscribeQueue(queue); // forward data from the Topic to the Queue

// create a talbe and accumulate counts of each key
const table = new HashTable(stack, 'count-table', {
  partitionKey: 'key',
  shape: {
    key: string(),
    count: integer()
  }
});

// SNS -> SQS -> Lambda -> DynamODB
queue
  .clients({table: table.writeClient()}) // use the table (with write permissions) at runtime
  .forEach(stack, 'OnMessage', async (event, {table}) => {
    // do something for each message in the SQS Queue
    // (runs in an AWS Lambda Function)
    try {
      // optimistically update item if it exists
      await table.update({
        key: {
          key: event.key
        },
        actions: item => [
          // translates to an UpdateExpression
          item.count.increment(event.count)
        ],
        if: item => attribute_exists(item.key) // only update if the item already exists (ConditionExpression)
      })
    } catch (err) {
      const ex: AWS.AWSError = err;
      if (ex.code === 'ConditionalCheckFailedException') {
        await table.put({
          item: event,
          if: item => attribute_not_exists(item.key) // only put if the item does not exist
        });
      }
    }
  });

// publish a dummy SNS message every minute
new LambdaExecutorService().schedule(stack, 'DummyData', {
  clients: {
    topic
  },
  rate: Rate.minutes(1),
  handle: async (_, {topic}) => {
    await topic.publish({
      Message: {
        key: 'some-key',
        count: 1
      }
    });
  }
});
