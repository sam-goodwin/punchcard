## Punchcard

Punchcard is an opinionated, high-level framework for building cloud-native applications on AWS with the [AWS Cloud Development Kit (CDK)](https://github.com/awslabs/aws-cdk). You create and use ordinary data structures that are backed by CDK `Constructs` and deployed to AWS CloudFormation. It creates a type-safe development experience that feels like local in-memory programming, but runs in the AWS cloud!

## Snippet

The below snippet should give you a feel for the `punchcard` developer experience:

```ts
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
 * SNS --(subscription)--> SQS
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
 * Persist Kinesis Stream data as a tome-series Glue Table.
 * 
 * Kinesis Stream -> Firehose Delivery Stream -> S3 (staging) -> Lambda -> S3 (partitioned by `year`, `month`, `day`, `hour` and `minute`)
 *                                                                      -> Glue Catalog
 */
const database = new glue.Database(stack, 'Database', {
  databaseName: 'my_database'
});
stream
  .toS3(stack, 'ToS3').enumerable()
  .toGlueTable(stack, 'ToGlue', {
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
```

## [Examples]([examples](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib))
* [Stream Processing](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/stream-processing.ts) - respond to SNS notifications with a Lambda Function; subscribe notifications to a SQS Queue and process them with a Lambda Function; process and forward data from a SQS Queue to a Kinesis Stream.
* [Invoke a Function from another Function](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/invoke-function.ts) - call a Function from another Function
* [Real-Time Data Lake](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/data-lake.ts) - collects data with Kinesis and persists to S3, exposed as a Glue Table in a Glue Database.
* [Scheduled Lambda Function](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/scheduled-function.ts) - runs a Lambda Function every minute and stores data in a DynamoDB Table.
* [Pet Store API Gateway](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/pet-store-apigw.ts) - implementation of the [Pet Store API Gateway canonical example](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-from-example.html).

## Getting Started 

This library is built with (and relies on) the AWS CDK, see their [documentation](https://docs.aws.amazon.com/cdk/latest/guide/what-is.html) before proceeding.

Initialize a CDK application:
```shell
cdk init app --language=typescript
```

Install `punchcard`:

```shell
npm install --save punchcard
```

Replace the stack contents:

```ts
import cdk = require('@aws-cdk/cdk');
import punchcard = require('punchcard');

const app = new cdk.App();
const stack = new cdk.Stack(app, 'CronStack');

// make sure you export the app as default, or else your code won't run at runtime
export default app;

// create and use punchcard constructs
const table = new punchcard.HashTable(stack, 'MyTable', {
  // ...
});
```

Compile your code and deploy the app with the `cdk`:

```shell
npm run build
./node_modules/aws-cdk/bin/cdk deploy -a ./index.js
```

## License

This library is licensed under the Apache 2.0 License. 
