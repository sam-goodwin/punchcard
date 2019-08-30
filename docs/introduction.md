## Punchcard

Punchcard is a TypeScript framework for building cloud applications with the [AWS CDK](https://github.com/aws/aws-cdk). It unifies **infrastructure** code with **runtime** code, meaning you can both declare resources and implement logic within the context of one node.js application. AWS resources are thought of as generic, type-safe objects — DynamoDB Tables are like a `Map<K, V>`; SNS Topics, SQS Queues, and Kinesis Streams feel like an `Array<T>`; and a Lambda Function is akin to a `Function<A, B>` – like the standard library of a programming language.

If you'd like to learn more about the philosophy behind this project, check out [Punchcard: Imagining the future of cloud programming](https://bit.ly/punchcard-cdk).

Let's walk through some punchcard features to demonstrate:

### Runtime Code and Dependencies

Creating a Lambda Function is super simple - just create it and implement `handle`:

```ts
new Lambda.Function(stack, 'MyFunction', {
  handle: async (event) => {
    console.log('hello world');
  }
});
```

To contact other services in your Function, data structures such as SNS Topics, SQS Queues, DynamoDB Tables, etc. are declared as a `Dependency`. 

This will create the required IAM policies for your Function's IAM Role, add any environment variables for details such as the Topic's ARN, and automatically create a client for accessing the `Construct`. The result is that your `handle` function is now passed a `topic` instance which you can interact with:

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

Furthermore, its interface is higher-level than what would normally be expected when using the `aws-sdk`, and it's also type-safe: the argument to the `publish` method is not an opaque `string` or `Buffer`, it is an `object` with keys and rich types such as `Date`. This is because data structures in punchcard, such as `Topic`, `Queue`, `Stream`, etc. are generic with statically declared types (like an `Array<T>`):

```ts
const topic = new SNS.Topic(stack, 'Topic', {
  /**
   * Message is a JSON Object with properties: `key`, `count` and `timestamp`.
   */
  type: struct({
    key: string(),
    count: integer(),
    timestamp
  })
});
```

This `Topic` is now of type:
```ts
Topic<{
  key: string;
  count: number;
  timestamp: Date;
}>
```

This feature in punchcard becomes even more evident when using DynamoDB. To demonstrate, let's create a DynamoDB `Table` and use it in a `Function`:

```ts
const table = new DynamoDB.Table(stack, 'my-table', {
  partitionKey: 'id',
  shape: {
    id: string(),
    count: integer({
      minimum: 0
    })
  },
  billingMode: BillingMode.PAY_PER_REQUEST
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

Then you can also build typesafe query expressions:

```ts
await table.query({
  key: {
    id: 'id',
    count: DynamoDB.greaterThan(1)
  },
})
```
### Streams

Punchcard also has the concept of `Stream` data structures, which should feel similar to in-memory streams/arrays/lists because of its chainable API, including operations such as `map`, `flatMap`, `filter`, `collect` etc.

Data structures that implement `Stream` are: `Topic`, `Queue`, `Stream`, `Bucket` and (Glue) `Table`.

Let's look at some examples of how powerful this flow can be.

Given a SNS Topic:
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
