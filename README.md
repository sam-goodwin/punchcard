![CodeBuild badge](https://codebuild.us-west-2.amazonaws.com/badges?uuid=eyJlbmNyeXB0ZWREYXRhIjoiT1BiL0lLYk5SMmgvTjVsc2x5N1JMTm1jTVFDTXJ2UzF1ZTlhN2xESVVOWThza3lBbEZaejBrYm5kSDFoT0pWUTlxR1IrTnRIWE9mZGVuS0d1RXJlUHU4PSIsIml2UGFyYW1ldGVyU3BlYyI6IjFjRTg3WjJ1a2ZhNDBqVVIiLCJtYXRlcmlhbFNldFNlcmlhbCI6MX0%3D&branch=master)
[![Gitter](https://badges.gitter.im/punchcard-cdk/community.svg)](https://gitter.im/punchcard-cdk/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
[![npm version](https://badge.fury.io/js/punchcard.svg)](https://badge.fury.io/js/punchcard)

## Punchcard

Punchcard is a TypeScript framework for building cloud applications with the [AWS CDK](https://github.com/aws/aws-cdk). It unifies **infrastructure** code with **runtime** code, meaning you can both declare resources and implement logic within the context of one node.js application. AWS resources are thought of as generic, type-safe objects — DynamoDB Tables are like a `Map<K, V>`; SNS Topics, SQS Queues, and Kinesis Streams feel like an `Array<T>`; and a Lambda Function is akin to a `Function<A, B>` – like the standard library of a programming language.

If you'd like to learn more about the philosophy behind this project, check out [Punchcard: Imagining the future of cloud programming](https://bit.ly/punchcard-cdk).

Let's walk through some punchcard features to demonstrate.

### Runtime Code and Dependencies

Creating a `Lambda.Function` is super simple - just instantiate it and implement `handle`:

```ts
new Lambda.Function(stack, 'MyFunction', {
  handle: async (event) => {
    console.log('hello world');
  }
});
```

To contact other services in your Function, data structures such as `SNS.Topic`, `SQS.Queue`, `DynamoDB.Table`, etc. are declared as a runtime `Dependency`.

```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: topic,
  // <redacted>
});
```

This will create the required IAM policies for your Function's IAM Role, add any environment variables for details such as a SNS Topic's ARN, and automatically create a client for accessing the `Construct` at runtime. The result is that your `handle` function is now passed a `topic` instance which you can interact with:

```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: topic,
  handle: async (event, topic) => {
    await topic.publish({
      key: 'some key',
      count: 1,
      timestamp: new Date(),
      tags : ['some', 'tags']
    });
  }
});
```

### Type-Safe DDLs with Punchcard "Shapes"

Notice how the `topic` interface is type-safe:

```ts
await topic.publish({
  key: 'some key',
  count: 1,
  timestamp: new Date(),
  tags : ['some', 'tags']
});
```

The notification passed to the `publish` method is not an opaque `string` or `Buffer` (like it would be in the `aws-sdk`) it is an `object` with rich types such as `Date` and `Array` known at compile-time. This is because data structures in punchcard are like ordinary generic collections (e.g. `Array<T>`), except their type is explicitly defined with *data*:

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

This is an example of how Punchcard deploys TypeScript's [Advanced Types](https://www.typescriptlang.org/docs/handbook/advanced-types.html) to abstract both the CloudFormation Resource and Runtime API of an AWS service. At the core of this machinery is a "virtual type-system" for defining data, called **Shapes**.

Shapes are an in-code abstraction for (and agnostic to) DDLs such as JSON Schema, Avro, Protobuf, Hive Tables, Parquet, etc. with the following types:

| Punchcard Type    | Runtime Type | Example    |
|-------------------|--------------|------------|
| `BooleanType`     | `boolean`    | `boolean`  |
| `BinaryType`      | `Buffer`     | `binary()` |
| `StringType`      | `string`     | `string()` |
| `IntegerType`     | `number`     | `integer()`|
| `BigIntType`      | `number`     | `bigint()` |
| `SmallIntType`    | `number`     | `smallint()`|
| `TinyInt`         | `number`     | `tinyint()` |
| `FloatType`       | `number`     | `float()`   |
| `DoubleType`      | `number`     | `double()`  |
| `ArrayType<T>`    | `Array<T>`   | `array(string())`|
| `SetType<T>`      | `Set<T>`     | `set(string())`  |
| `MapType<T>`      | `{[K: string]: T}` | `map(string())`|
| `StructType<T>`   | `{[K in keyof T]: T[K]}` | `struct({name: string()})`|

That `SNS.Topic` we created has the following type (with the Shape encoded within it):
```ts
SNS.Topic<{
  key: StringType;
  count: IntegerType;
  timestamp: TimestampType;
  tags: ArrayType<StringType>;
}>
```

So, the `topic` client (passed to `handle` at runtime) has a `publish` function with this signature:
```ts
public publish(notification: {
  key: string;
  count: number;
  timestamp: Date;
  tags: string[];
}): Promise<AWS.SNS.PublishOutput>;
```

The framework makes use of the Topic's Shape to automatically (and safely) serialize rich objects to and from JSON. Your application code is only concerned with the deserialized and validated object, so the system is protected from bad data at both *compile time* and *runtime*.

### Service API Domain-Specific-Languages

The Shape system drives various runtime DSLs which provide high-level and type-safe interfaces for interacting with AWS services. We briefly showed this with an SNS Topic, but it is especially powerful for services like AWS DynamoDB.

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

Now, when getting an item from DynamoDB, there is no need to use `AttributeValues` such as `{ S: 'my string' }`. You simply use ordinary javascript types:

```ts
const item = await table.get({
  id: 'state'
});
item.id; // string
item.count; // number
//item.missing // does not compile
```

The interface is statically typed and derived from the definition of the `Table` - we specified the `partitionKey` as the `id` field which has type `string`, and so the object passed to the `get` method must correspond. More interestingly, a type-safe DSL is also generated for building [Condition Expressions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html), [Update Expressions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html) and [Query Expressions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html):

A **Condition Expression** is defined with `if` when putting an item:
```ts
await table.put({
  item: {
    id: 'state',
    count: 1
  },
  if: item => item.count.equals(0)
});
```

Which automatically (and safely) renders the following expression:
```js
{
  ConditionExpression: '#0 = :0',
  ExpressionAttributeNames: {
    '#0': 'count'
  },
  ExpressionAttributeValues: {
    ':0': {
      N: '0'
    }
  }
}
```

**Update Expressions** are similar - you assemble an array of `actions` when updating an item:
```ts
await table.update({
  key: {
    id: 'state'
  },
  actions: item => [
    item.count.increment(1)
  ]
});
```

Which automaticlaly (and safely) renders the following expression:
```js
{
  UpdateExpression: '#0 = #0 + :0',
  ExpressionAttributeNames: {
    '#0': 'count'
  },
  ExpressionAttributeValues: {
    ':0': {
      N: '1'
    }
  }
}
```

If you also specify a `sortKey`:
```ts
const table = new DynamoDB.Table(stack, 'my-table', {
  partitionKey: 'id',
  sortKey: 'count', // specify a sortKey
  // ...
});
```

Then you can build typesafe **Query Expressions**:

```ts
await table.query({
  key: {
    id: 'id',
    count: DynamoDB.greaterThan(1)
  },
})
```

Which automatically (and safely) renders the following low-level expression:
```js
{
  KeyConditionExpression: '#0 = :0 AND #1 > :1',
  ExpressionAttributeNames: {
    '#0': 'id',
    '#1': 'count'
  },
  ExpressionAttributeValues: {
    ':0': {
      S: 'id'
    },
    ':1': {
      N: '1'
    }
  }
}
```

To clarify this type machinery, note how the `DynamoDB.Table`'s type defintion encodes the partition key (`'id'`), sort key (`undefined`) and the `Shape` of an item:

```ts
DynamoDB.Table<'id', undefined, {
  id: StringType,
  count: IntegerType
}>
```

And, how a table with a definded sort key (`count`) has this type:
```ts
DynamoDB.Table<'id', 'count' /* sort key is now defined */, { .. }>
```

Check out the [DynamoDB example](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/dynamodb.ts#L74) for more magic.

### Stream Processing and Event Sources

Punchcard also has the concept of `Stream` data structures, which feel like in-memory streams/arrays/lists because of its chainable API, including operations such as `map`, `flatMap`, `filter` and `collect`. These operations fluidly create chains of Lambda Functions and [Event Sources](https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html).

Data structures that implement `Stream` are: `SNS.Topic`, `SQS.Queue`, `Kinesis.Stream`, `Firehose.DeliveryStream` and `Glue.Table`. Let's look at some examples of how powerful this flow can be.

Given an `SNS.Topic`:
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
const queue = topic.toSQSQueue(stack, 'MyNewQueue');
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
const s3DeliveryStream = stream.toFirehoseDeliveryStream(stack, 'ToS3');
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
