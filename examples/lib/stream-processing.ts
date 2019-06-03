import cdk = require('@aws-cdk/cdk');
import { integer, string, struct, Topic, Rate, λ, HashTable, array, timestamp, Dependency } from 'punchcard';

import uuid = require('uuid');
import { BillingMode } from '@aws-cdk/aws-dynamodb';
import glue = require('@aws-cdk/aws-glue');
import { StreamEncryption } from '@aws-cdk/aws-kinesis';

const app = new cdk.App();
export default app;
const stack = new cdk.Stack(app, 'stream-processing');

// create a strongly-typed SNS Topic
const topic = new Topic(stack, 'Topic', {
  type: struct({
    key: string(),
    count: integer(),
    timestamp
  })
});

// process each SNS notification in Lambda
topic.stream().forEach(stack, 'ForEachNotification', {
  async handle(message) {
    console.log(`received notification '${message.key}' with a delay of ${new Date().getTime() - message.timestamp.getTime()}ms`);
  }
});

// subscribe topic to a new SQS Queue
const queue = topic.toQueue(stack, 'Queue');

// create a table to store some data to enrich SQS messages with
const enrichments = new HashTable(stack, 'Enrichments', {
  partitionKey: 'key',
  shape: {
    key: string(),
    tags: array(string())
  },
  billingMode: BillingMode.PayPerRequest
});

// process each message in SQS, attach some data from a DynamoDB lookup, and persist results in a Kinesis Stream.
const [stream, processor] = queue.stream()
  .map({
    // define your dependencies - in this case, we need read access to the enrichments table
    depends: enrichments.readAccess(),
    handle: async(message, e) => {
      // implement the enrichment procedure - runs in Lambda triggered by SQS
      const enrichment = await e.get({
        key: message.key
      });

      return {
        ...message,
        tags: enrichment ? enrichment.tags : []
      };
    }
  }) // #toStream returns a tuple, containing the stream and the lambda function responsible for sending it data
  .toStream(stack, 'Stream', {
    // encrypt values in the stream with a customer-managed KMS key.
    encryption: StreamEncryption.Kms,
    // partition values across shards by the 'key' field
    partitionBy: value => value.key,
    type: struct({
      key: string(),
      count: integer(),
      tags: array(string())
    })
  });

// Lastly, we'll kick off the whole system with a dummy notification sent once per minute
λ().schedule(stack, 'DummyData', {
  rate: Rate.minutes(1),
  depends: Dependency.list(topic, enrichments),
  handle: async (_, [topic, enrichments]) => {
    const key = uuid();
    // this data will be queried by lambda when processing SQS messages
    await enrichments.put({
      item: {
        key,
        tags: ['some', 'tags']
      }
    });

    // trigger the example pipeline by emitting a SNS notification
    await topic.publish({
      // message is structured and statically typed
      Message: {
        key,
        count: 1,
        timestamp: new Date()
      }
    });
  }
});
