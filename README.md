![CodeBuild badge](https://codebuild.us-west-2.amazonaws.com/badges?uuid=eyJlbmNyeXB0ZWREYXRhIjoiT1BiL0lLYk5SMmgvTjVsc2x5N1JMTm1jTVFDTXJ2UzF1ZTlhN2xESVVOWThza3lBbEZaejBrYm5kSDFoT0pWUTlxR1IrTnRIWE9mZGVuS0d1RXJlUHU4PSIsIml2UGFyYW1ldGVyU3BlYyI6IjFjRTg3WjJ1a2ZhNDBqVVIiLCJtYXRlcmlhbFNldFNlcmlhbCI6MX0%3D&branch=master)
[![Gitter](https://badges.gitter.im/punchcard-cdk/community.svg)](https://gitter.im/punchcard-cdk/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
[![npm version](https://badge.fury.io/js/punchcard.svg)](https://badge.fury.io/js/punchcard)

## Punchcard

Punchcard is a TypeScript framework for building cloud applications with the [AWS CDK](https://github.com/aws/aws-cdk). It unifies **infrastructure** code with **runtime** code, meaning you can both declare resources and implement logic within the context of one node.js application. AWS resources are thought of as generic, type-safe objects — DynamoDB Tables are like a `Map<K, V>`; SNS Topics, SQS Queues, and Kinesis Streams feel like an `Array<T>`; and a Lambda Function is akin to a `Function<A, B>` – like the standard library of a programming language.

If you'd like to learn more about the philosophy behind this project, check out [Punchcard: Imagining the future of cloud programming](https://bit.ly/punchcard-cdk).

Let's walk through some punchcard features to demonstrate:

### Runtime Code and Dependencies

Creating a `Lambda.Function` is super simple - just instantiate it and implement `handle`:

```ts
new Lambda.Function(stack, 'MyFunction', {
  handle: async (event) => {
    console.log('hello world');
  }
});
```

To contact other services in your Function, data structures such as `SNS.Topic`, `SQS.Queue`, `DynamoDB.Table`, etc. are declared as a runtime `Dependency`. This will create the required IAM policies for your Function's IAM Role, add any environment variables for details such as a SNS Topic's ARN, and automatically create a client for accessing the `Construct` at runtime.

```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: topic,
  // <redacted>
});
```

The result is that your `handle` function is now passed a `topic` instance which you can interact with:

```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: topic,
  handle: async (event, topic) => {
    await topic.publish({
      key: 'some key',
      count: 1,
      timestamp: new Date()
    });
  }
});
```

### Type-Safety

Notice how the `topic` interface is type-safe:

```ts
await topic.publish({
  key: 'some key',
  count: 1,
  timestamp: new Date(),
  tags : ['some', 'tags']
});
```

The notification passed to the `publish` method is not an opaque `string` or `Buffer` (like it would be in the `aws-sdk`) it is an `object` with rich types such as `Date` and `Array`. This is because data structures in punchcard are generic with statically declared types (like an ordinary `Array<T>`).

The type of the `SNS.Topic`'s notifications is explicitly defined with data:

```ts
const topic = new SNS.Topic(stack, 'Topic', {
  type: struct({
    key: string(),
    count: integer(),
    timestamp,
    tags: array(string())
  })
});
```

This `SNS.Topic` now has a type of:
```ts
SNS.Topic<{
  key: StringType;
  count: IntegerType;
  timestamp: TimestampType;
  tags: ArrayType<StringType>;
}>
```

So, the `topic` client's `publish` function has this signature:
```ts
public publish(notification: {
  key: string;
  count: number;
  timestamp: Date;
  tags: string[];
}): Promise<AWS.SNS.PublishOutput>;
```

### Data Types

Punchcard supports the following Data Types:

| Punchcard Type    | Runtime Type | Example
|-------------------|--------------|----------------
| `BooleanType`     | `boolean`    | `boolean`
| `BinaryType`      | `Buffer`     | `binary()`
| `StringType`      | `string`     | `string()`
| `IntegerType`     | `number`     | `integer()`
| `BigIntType`      | `number`     | `bigint()`
| `SmallIntType`    | `number`     | `smallint()`
| `TinyInt`         | `number`     | `tinyint()`
| `FloatType`       | `number`     | `float()`
| `DoubleType`      | `number`     | `double()`
| `ArrayType<T>`    | `Array<T>`   | `array(string())`
| `SetType<T>`      | `Set<T>`     | `set(string())`
| `MapType<T>`      | `{[K: string]: T}` | `map(string())`
| `StructType<T>`   | `{[K in keyof T]: T[K]}` | `struct({name: string()})`

### Runtime DSLs

This "virtual type-system" drives various runtime DSLs that provide high-level and type-safe interfaces for interacting with AWS services. This is especially useful for services like AWS DynamoDB.

To demonstrate, let's create a `DynamoDB.Table`:
```ts
const table = new DynamoDB.Table(stack, 'my-table', {
  partitionKey: 'id',
  shape: {
    id: string(),
    count: integer()
  },
  billingMode: BillingMode.PAY_PER_REQUEST
});
```

The table has type. *Note how the partition key (`'id'`) and sort key (`undefined`) is encoded in the `DynamoDB.Table`*.
```ts
DynamoDB.Table<'id', undefined, {
  id: StringType,
  count: IntegerType
}>
```

Now, when getting an item from DynamoDB, there is no need to use `AttributeValues` such as `{ S: 'my string' }` (like you would when using the low-level `aws-sdk`). You simply use ordinary javascript types:

```ts
const item = await table.get({
  id: 'state'
});
```

The interface is statically typed and derived from the definition of the `Table` - we specified the `partitionKey` as the `id` field which has type `string`, and so the object passed to the `get` method must correspond.

More interestingly, condition and update expressions are built with helpers derived (again) from the table definition:

```ts
// put an item if it doesn't already exist
await table.put({
  item: {
    id: 'state',
    count: 1
  },
  if: item => DynamoDB.attribute_not_exists(item.id)
});

// increment the count property by 1
await table.update({
  key: {
    id: 'state'
  },
  actions: item => [
    item.count.increment(1)
  ]
});
```

If you specified a `sortKey`:
```ts
const table = new DynamoDB.Table(stack, 'my-table', {
  partitionKey: 'id',
  sortKey: 'count', // specify a sortKey
  // ...
});
```

Then, the `DynamoDB.Table` has this type:
```ts
DynamoDB.Table<'id', 'count' /* sort key is now defined */, {
  id: StringType,
  count: IntegerType
}>
```

So, you can also build typesafe query expressions:

```ts
await table.query({
  key: {
    id: 'id',
    count: DynamoDB.greaterThan(1)
  },
})
```

Check out the [DynamoDB example](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/dynamodb.ts#L74) to learn more about how to use DynamoDB.

### Infrastructure DSLs (Streams)

Punchcard also has the concept of `Stream` data structures, which should feel similar to in-memory streams/arrays/lists because of its chainable API, including operations such as `map`, `flatMap`, `filter` and `collect`. Data structures that implement `Stream` are: `SNS.Topic`, `SQS.Queue`, `Kinesis.Stream`, `Firehose.DeliveryStream` and `Glue.Table`.

Let's look at some examples of how powerful this flow can be. Given an `SNS.Topic`:
```ts
const topic = new SNS.Topic(stack, 'Topic', {
  type: struct({
    key: string(),
    count: integer(),
    timestamp
  })
});
```

You can attach a new Lambda Function to process each notification:
```ts
topic.stream().forEach(stack, 'ForEachNotification', {
  handle: async (notification) => {
    console.log(`notification delayed by ${new Date().getTime() - notification.timestamp.getTime()}ms`);
  }
})
```

Or, create a new SQS Queue and subscribe notifications to it:

*(Messages in the `Queue` are of the same type as the notifications in the `Topic`.)*

```ts
const queue = topic.toSQS(stack, 'MyNewQueue');
```

We can then, perhaps, `map` over each message in the `Queue` and collect the results into a new AWS Kinesis `Stream`:

```ts
const stream = queue.stream()
  .map({
    handle: async(message, e) => {
      return {
        ...message,
        tags: ['some', 'tags'],
      };
    }
  })
  .toKinesisStream(stack, 'Stream', {
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
```

With data in a `Stream`, we might want to write out all records to a new S3 `Bucket` by attaching a new Firehose `DeliveryStream` to it:

```ts
const s3DeliveryStream = stream.toS3DeliveryStream(stack, 'ToS3');
```

With data now flowing to S3, let's partition and catalog it in a Glue `Table` (backed by a new S3 `Bucket`) so we can easily query it with AWS Athena, AWS EMR and AWS Glue:

```ts
import glue = require('@aws-cdk/aws-glue');

const database = new glue.Database(stack, 'Database', {
  databaseName: 'my_database'
});
s3DeliveryStream.stream().toGlueTable(stack, 'ToGlue', {
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
More detailed examples can be found in the source:
* [Stream Processing](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/stream-processing.ts) - respond to SNS notifications with a Lambda Function; subscribe notifications to a SQS Queue and process them with a Lambda Function; process and forward data from a SQS Queue to a Kinesis Stream; sink records from the Stream to S3 and catalog it in a Glue Table.
* [Invoke a Function from another Function](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/invoke-function.ts) - call a Function from another Function
* [Real-Time Data Lake](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/data-lake.ts) - collects data with Kinesis and persists to S3, exposed as a Glue Table in a Glue Database.
* [Scheduled Lambda Function](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/scheduled-function.ts) - runs a Lambda Function every minute and stores data in a DynamoDB Table.
* [Pet Store API Gateway](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/pet-store-apigw.ts) - implementation of the [Pet Store API Gateway canonical example](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-from-example.html).

## Getting Started 

This library is built with (and relies on) the AWS CDK, so make sure you read their [documentation](https://docs.aws.amazon.com/cdk/latest/guide/what-is.html) first.

A punchcard application is not too different than a CDK application - the only difference is that you must export the `@aws-cdk/core.App` as `default` from your application's entry-point. Instructions below should be all that is required to get started:

Install `punchcard` and the `aws-cdk`:

```shell
npm install --save-dev aws-cdk
npm install --save @aws-cdk/core
npm install --save punchcard
```

Create an `index.ts` file to contain your application's entrypoint:

```ts
import cdk = require('@aws-cdk/core');
import { DynamoDB } from 'punchcard';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'MyStack');

// NOTE: make sure you export the app as default, or else your code won't run at runtime
export default app;

// create and use punchcard or CDK constructs
const table = new DynamoDB.Table(stack, 'MyTable', {
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
