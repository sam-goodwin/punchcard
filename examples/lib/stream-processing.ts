import glue = require('@aws-cdk/aws-glue')
import cdk = require('@aws-cdk/cdk');
import { integer, string, struct, Topic, Rate, λ, HashTable, array, timestamp, Dependency } from 'punchcard';

import uuid = require('uuid');
import { BillingMode } from '@aws-cdk/aws-dynamodb';
import { StreamEncryption } from '@aws-cdk/aws-kinesis';

const app = new cdk.App();
export default app;
const stack = new cdk.Stack(app, 'stream-processing');

/**
 * Create a SNS Topic.
 */
const topic = new Topic(stack, 'Topic', {
  /**
   * Message is a JSON Object with properties: `key`, `count` and `timestamp`.
   */
  type: struct({
    key: string(),
    count: integer(),
    timestamp
  })
});

/**
 * Create a DynamoDB Table to store some data.
 */
const enrichments = new HashTable(stack, 'Enrichments', {
  partitionKey: 'key',
  shape: {
    // define the shape of data in the dynamodb table
    key: string(),
    tags: array(string())
  },
  billingMode: BillingMode.PayPerRequest
});

/**
 * Schedule a Lambda Function to send a (dummy) message to the SNS topic:
 * 
 * CloudWatch Event --(minutely)--> Lambda --(send)-> SNS Topic
 *                                         --(put)--> Dynamo Table
 **/ 
λ().schedule(stack, 'DummyData', {
  rate: Rate.minutes(1),

  /**
   * Define our runtime dependencies:
   *
   * We want to *publish* to the SNS `topic` and *write* to the DynamoDB `table`.
   */
  depends: Dependency.list(topic, enrichments.writeAccess()),

  /**
   * Impement the Lambda Function.
   * 
   * We will be passed clients for each of our dependencies: the `topic` and `table`.
   */
  handle: async (_, [topic, table]) => {
    const key = uuid();
    // write some data to the dynamodb table
    await table.put({
      item: {
        key,
        tags: ['some', 'tags']
      }
    });

    // publish a SNS notification
    await topic.publish({
      // message is structured and strongly typed (based on our Topic definition above)
      key,
      count: 1,
      timestamp: new Date()
    });
  }
});

/**
 * Process each SNS notification in Lambda:
 *
 * SNS -> Lambda
 */
topic.enumerable().forEach(stack, 'ForEachNotification', {
  async handle(message) {
    console.log(`received notification '${message.key}' with a delay of ${new Date().getTime() - message.timestamp.getTime()}ms`);
  }
});

/**
 * Subscribe SNS Topic to a SQS Queue:
 *
 * SQS --(subscription)--> SNS
 */
const queue = topic.toQueue(stack, 'Queue');

/**
 * Process each message in SQS with Lambda, look up some data in DynamoDB, and persist results in a Kinesis Stream:
 *
 *              Dynamo
 *                | (get)
 *                v
 * SQS Queue -> Lambda -> Kinesis Stream
 */
const stream = queue.enumerable() // enumerable gives us a nice chainable API for resources like queues, streams, topics etc.
  .map({
    depends: enrichments.readAccess(),
    handle: async(message, e) => {
      // here we transform messages received from SQS by looking up some data in DynamoDB
      const enrichment = await e.get({
        key: message.key
      });

      return {
        ...message,
        tags: enrichment ? enrichment.tags : [],
        timestamp: new Date()
      };
    }
  })
  .toStream(stack, 'Stream', {
    // encrypt values in the stream with a customer-managed KMS key.
    encryption: StreamEncryption.Kms,

    // partition values across shards by the 'key' field
    partitionBy: value => value.key,

    // type of the data in the stream
    type: struct({
      key: string(),
      count: integer(),
      tags: array(string()),
      timestamp
    })
  });

/**
 * Persist data in a Kinesis Stream as a Glue Table.
 * 
 * Kinesis Stream -> Firehose Delivery Stream -> S3 (staging) -> Lambda -> S3 (partitioned by `year`, `month`, `day`, `hour` and `minute`)
 *                                                                      -> Glue Table
 */
const database = new glue.Database(stack, 'Database', {
  databaseName: 'my_database'
});
stream.toGlueTable(stack, 'ToGlueDirectly', {
  database,
  tableName: 'my_table',
  columns: stream.type.shape,
  partition: {
    // Glue Table partition keys: minutely using the timestamp field
    keys: {
      year: integer(),
      month: integer(),
      day: integer(),
      hour: integer(),
      minute: integer()
    },
    get: record => ({
      // define the mapping of a record to its Glue Table partition keys
      year: record.timestamp.getUTCFullYear(),
      month: record.timestamp.getUTCMonth(),
      day: record.timestamp.getUTCDate(),
      hour: record.timestamp.getUTCHours(),
      minute: record.timestamp.getUTCMinutes(),
    })
  }
});
