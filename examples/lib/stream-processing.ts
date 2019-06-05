import glue = require('@aws-cdk/aws-glue')
import cdk = require('@aws-cdk/cdk');
import { integer, string, struct, Topic, Rate, λ, HashTable, array, timestamp, Dependency, Collectors } from 'punchcard';

import uuid = require('uuid');
import { BillingMode } from '@aws-cdk/aws-dynamodb';
import { StreamEncryption } from '@aws-cdk/aws-kinesis';

const app = new cdk.App();
export default app;
const stack = new cdk.Stack(app, 'stream-processing');

/**
 * Create a strongly-typed SNS Topic.
 */
const topic = new Topic(stack, 'Topic', {
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
const stream = queue.enumerable()
  .map({
    // define your dependencies - in this case, we need read access to the enrichments table
    depends: enrichments.readAccess(),
    
    // implement the enrichment procedure (runs in Lambda triggered by SQS)
    handle: async(message, e) => {
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
    // structure of the data in the stream
    type: struct({
      key: string(),
      count: integer(),
      tags: array(string()),
      timestamp
    })
  });

/**
 * Kinesis Stream -> Firehose Delivery Stream -> S3 (staging) -> Lambda -> S3 (partitioend by `year`, `month`, `day`, `hour` and `minute`)
 *                                                                      -> Glue Table
 */
stream.toGlueTable(stack, 'ToGlueDirectly', {
  database: new glue.Database(stack, 'Database', {
    databaseName: 'my_database'
  }),
  tableName: 'my_table',
  columns: stream.type.shape,
  partition: {
    // partition data minutely using the timestamp field
    keys: {
      year: integer(),
      month: integer(),
      day: integer(),
      hour: integer(),
      minute: integer()
    },
    get: record => ({
      year: record.timestamp.getUTCFullYear(),
      month: record.timestamp.getUTCMonth(),
      day: record.timestamp.getUTCDate(),
      hour: record.timestamp.getUTCHours(),
      minute: record.timestamp.getUTCMinutes(),
    })
  }
});
