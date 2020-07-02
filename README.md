![CodeBuild badge](https://codebuild.us-west-2.amazonaws.com/badges?uuid=eyJlbmNyeXB0ZWREYXRhIjoiZFYyRk82d3plVWlNdW8xblNKZk1XOEpCSkwvQTZjeUFVMG1odkdDWFU3Zm1CVXZYcENWS0VCbW52QnNieml3NFUvTnlYbkIzVUJGU2U1a0hTanlRYitVPSIsIml2UGFyYW1ldGVyU3BlYyI6IlY2TGhPdjJ6ZjZZVVJxVDgiLCJtYXRlcmlhbFNldFNlcmlhbCI6MX0%3D&branch=master)
[![Gitter](https://badges.gitter.im/punchcard-cdk/community.svg)](https://gitter.im/punchcard-cdk/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
[![npm version](https://badge.fury.io/js/punchcard.svg)](https://badge.fury.io/js/punchcard)

# Punchcard

Punchcard is a TypeScript framework for building cloud applications with the [AWS CDK](https://github.com/aws/aws-cdk). It unifies **infrastructure** code with **runtime** code, meaning you can both declare resources and implement logic within the context of one node.js application. AWS resources are thought of as generic, type-safe objects — DynamoDB Tables are like a `Map<K, V>`; SNS Topics, SQS Queues, and Kinesis Streams feel like an `Array<T>`; and a Lambda Function is akin to a `Function<A, B>` – like the standard library of a programming language.

# Blog Series

If you'd like to learn more about the philosophy behind this project, check out my blog series (WIP) [Punchcard: Imagining the future of cloud programming](https://bit.ly/punchcard-cdk).

# Sample Repository

https://github.com/punchcard/punchcard-example - fork to get started

# Developer Guide

To understand the internals, there is the guide:

1. [Getting Started](docs/1-getting-started.md)
2. [Creating Functions](docs/2-creating-functions.md)
3. [Runtime Dependencies](docs/3-runtime-dependencies.md)
4. [Shapes: Type-Safe Schemas](docs/4-shapes.md)
5. [Dynamic (and safe) DynamoDB DSL](docs/5-dynamodb-dsl.md)
6. [Stream Processing](docs/6-stream-processing.md)

# Tour

Initialize an App and Stack:
```ts
const app = new Core.App();
const stack = app.stack('hello-world');
```

## Runtime Code and Dependencies

Creating a Lambda Function is super simple - just create it and implement `handle`:

```ts
new Lambda.Function(stack, 'MyFunction', {}, async (event) => {
  console.log('hello world');
});
```

To contact other services in your Function, data structures such as SNS Topics, SQS Queues, DynamoDB Tables, etc. are declared as a `Dependency`. 

This will create the required IAM policies for your Function's IAM Role, add any environment variables for details such as the Topic's ARN, and automatically create a client for accessing the `Construct`. The result is that your `handle` function is now passed a `topic` instance which you can interact with:

```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: topic,
}, async (event, topic) => {
  await topic.publish(new NotificationRecord({
    key: 'some key',
    count: 1,
    timestamp: new Date()
  }));
});
```

Furthermore, its interface is higher-level than what would normally be expected when using the `aws-sdk`, and it's also type-safe: the argument to the `publish` method is not an opaque `string` or `Buffer`, it is an `object` with keys and rich types such as `Date`. This is because data structures in punchcard, such as `Topic`, `Queue`, `Stream`, etc. are generic with statically declared types (like an `Array<T>`):

```ts
/**
 * Message is a JSON Object with properties: `key`, `count` and `timestamp`.
 */
class NotificationRecord extends Record({
  key: string,
  count: integer,
  timestamp
}) {}

const topic = new SNS.Topic(stack, 'Topic', {
  shape: NofiticationRecord
});
```

This `Topic` is now of type:
```ts
Topic<NotificationRecord>
```

## Type-Safe DynamoDB Expressions

This feature in punchcard becomes even more evident when using DynamoDB. To demonstrate, let's create a DynamoDB `Table` and use it in a `Function`:

```ts
// class describing the data in the DynamoDB Table
class TableRecord extends Record({
  id: string,
  count: integer
    .apply(Minimum(0))
}) {}

// table of TableRecord, with a single hash-key: 'id'
const table = new DynamoDB.Table(stack, 'my-table', {
  data: TableRecord
  key: {
    partition: 'id'
  }
});
```

Now, when getting an item from DynamoDB, there is no need to use `AttributeValues` such as `{ S: 'my string' }`, like you would when using the low-level `aws-sdk`. You simply use ordinary javascript types:

```ts
const item = await table.get({
  id: 'state'
});
```

The interface is statically typed and derived from the definition of the `Table` - we specified the `partitionKey` as the `id` field which has type `string`, and so the object passed to the `get` method must correspond.

`PutItem` and `UpdateItem` have similarly high-level and statically checked interfaces. More interestingly, condition and update expressions are built with helpers derived (again) from the table definition:

```ts
// put an item if it doesn't exist
await table.put(new TableRecord({
  id: 'state',
  count: 1
}), {
  if: _ => _.id.notExists()
});

// increment the count property by 1 if it is less than 0
await table.update({
  // value of the partition key
  id: 'state'
}, {
  // use the DSL to construt an array of update actions
  actions: _ => [
    _.count.increment(1)
  ],
  // optional: use the DSL to construct a conditional expression for the update
  if: _ => _.id.lessThan(0)
});
```

To also specify `sortKey`, use a tuple of `TableRecord's` keys:

```ts
const table = new DynamoDB.Table(stack, 'my-table',{
  data: TableRecord,
  key: {
    partition: 'id',
    sort: 'count'
  }
});
```

Now, you can also build typesafe query expressions:

```ts
await table.query({
  // id is the partition key, so we must provide a literal value
  id: 'id',
  // count is the sort key, so use the DSL to construct the sort-key condition
  count: _ => _.greaterThan(1)
}, {
  // optional: use the DSL to construct a filter expression
  filter: _ => _.count.lessThan(0)
})
```
## Stream Processing

Punchcard has the concept of `Stream` data structures, which should feel similar to in-memory streams/arrays/lists because of its chainable API, including operations such as `map`, `flatMap`, `filter`, `collect` etc. Data structures that implement `Stream` are: `SNS.Topic`, `SQS.Queue`, `Kinesis.Stream`, `Firehose.DeliveryStream` and `Glue.Table`.

For example, given an SNS Topic:
```ts
const topic = new SNS.Topic(stack, 'Topic', {
  shape: NotificationRecord
});
```

You can attach a new Lambda Function to process each notification:
```ts
topic.notifications().forEach(stack, 'ForEachNotification', {},
  async (notification) => {
    console.log(`notification delayed by ${new Date().getTime() - notification.timestamp.getTime()}ms`);
  });
```

Or, create a new SQS Queue and subscribe notifications to it:

*(Messages in the `Queue` are of the same type as the notifications in the `Topic`.)*

```ts
const queue = topic.toSQSQueue(stack, 'MyNewQueue');
```

We can then, perhaps, `map` over each message in the `Queue` and collect the results into a new AWS Kinesis `Stream`:

```ts
class LogDataRecord extends Record({
  key: string,
  count: integer,
  tags: array(string)
  timestamp
}) {}

const stream = queue.messages()
  .map(async (message, e) => new LogDataRecord({
    ...message,
    tags: ['some', 'tags'],
  }))
  .toKinesisStream(stack, 'Stream', {
    // partition values across shards by the 'key' field
    partitionBy: value => value.key,

    // type of the data in the stream
    shape: LogData
  });
```

With data in a `Stream`, we might want to write out all records to a new S3 `Bucket` by attaching a new Firehose `DeliveryStream` to it:

```ts
const s3DeliveryStream = stream.toFirehoseDeliveryStream(stack, 'ToS3');
```

With data now flowing to S3, let's partition and catalog it in a `Glue.Table` (backed by a new `S3.Bucket`) so we can easily query it with AWS Athena, AWS EMR and AWS Glue:

```ts
import glue = require('@aws-cdk/aws-glue');
import { Glue } from 'punchcard';

const database = stack.map(stack => new glue.Database(stack, 'Database', {
  databaseName: 'my_database'
}));
s3DeliveryStream.objects().toGlueTable(stack, 'ToGlue', {
  database,
  tableName: 'my_table',
  columns: LogDataRecord,
  partition: {
    // Glue Table partition keys: minutely using the timestamp field
    keys: Glue.Partition.Minutely,
    // define the mapping of a record to its Glue Table partition keys
    get: record => Glue.Partition.byMinute(record.timestamp)
  }
});
```

## Example Stacks

* [GraphQL API](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/straw-poll.ts) - Implements a GraphQL API with AWS AppSync for a real-time voting app, "straw poll".
* [Stream Processing](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/stream-processing.ts) - respond to SNS notifications with a Lambda Function; subscribe notifications to a SQS Queue and process them with a Lambda Function; process and forward data from a SQS Queue to a Kinesis Stream; sink records from the Stream to S3 and catalog it in a Glue Table.
* [Invoke a Function from another Function](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/invoke-function.ts) - call a Function from another Function
* [Real-Time Data Lake](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/data-lake.ts) - collects data with Kinesis and persists to S3, exposed as a Glue Table in a Glue Database.
* [Scheduled Lambda Function](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/scheduled-function.ts) - runs a Lambda Function every minute and stores data in a DynamoDB Table.
* [Pet Store API Gateway](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/pet-store-apigw.ts) - implementation of the [Pet Store API Gateway canonical example](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-from-example.html).

## License

This library is licensed under the Apache 2.0 License. 
