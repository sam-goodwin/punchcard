# Stream Processing and Event Sources

Punchcard has the concept of `Stream` data structures, which feel like in-memory streams/arrays/lists because of its chainable API, including operations such as `map`, `flatMap`, `filter` and `collect`. These operations fluidly create chains of Lambda Functions and [Event Sources](https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html).

Data structures that implement `Stream` are: `SNS.Topic`, `SQS.Queue`, `Kinesis.Stream`, `Firehose.DeliveryStream` and `Glue.Table`. Let's look at some examples of how powerful this flow can be.

Given an `SNS.Topic`:
```ts
class NotificationRecord extends Type({
  key: string,
  count: integer,
  timestamp
}) {}

const topic = new SNS.Topic(stack, 'Topic', {
  shape: NotificationRecord
});
```

You can attach a new Lambda Function to process each notification with `forEach`:
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

These functions are called `Collectors` and they follow the naming convention `to{service}{resource}`:
* `toFirehoseDeliveryStream`
* `toGlueTable`
* `toKinesisStream`
* `toSNSTopic`
* `toSQSQueue`

We can then, perhaps, `map` over each message in the `Queue` and collect the results into a new AWS Kinesis `Stream`:

```ts
class StreamDataRecord extends Type({
  key: string,
  count: integer,
  tags: array(string),
  timestamp
}) {}

const stream = queue.messages()
  .map(async(message, e) => new StreamDataRecord({
    ...message,
    tags: ['some', 'tags'],
  })
  .toKinesisStream(stack, 'Stream', {
    // type of the data in the stream
    shape: StreamDataRecord,

    // partition values across shards by the 'key' field
    partitionBy: value => value.key,
  });
```

With data in a `Stream`, we might want to write out all records to a new S3 `Bucket` by attaching a new Firehose `DeliveryStream` to it:

```ts
const s3DeliveryStream = stream.toFirehoseDeliveryStream(stack, 'ToS3');
```

With data now flowing to S3, let's partition and catalog it in a Glue `Table` (backed by a new S3 `Bucket`) so we can easily query it with AWS Athena, AWS EMR and AWS Glue:

```ts
import glue = require('@aws-cdk/aws-glue');
import { Glue } from 'punchcard';

const database = new glue.Database(stack, 'Database', {
  databaseName: 'my_database'
});
s3DeliveryStream.objects().toGlueTable(stack, 'ToGlue', {
  database,
  tableName: 'my_table',
  columns: StreamDataRecord,
  partition: {
    // Glue Table partition keys: minutely using the timestamp field
    keys: Glue.Partition.Minutely,
    get: record => new Glue.Partition.Monthly({
      // define the mapping of a record to its Glue Table partition keys
      year: record.timestamp.getUTCFullYear(),
      month: record.timestamp.getUTCMonth(),
      day: record.timestamp.getUTCDate(),
      hour: record.timestamp.getUTCHours(),
      minute: record.timestamp.getUTCMinutes(),
    }),

    // or use the utility methods in this case
    // get: record => Glue.Partition.byMonth(record.timestamp)
  }
});
```
