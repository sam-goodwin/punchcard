# Shapes: Type-Safe Schemas
Data structures in punchcard are like ordinary collections such as an `Array<T>` or `Map<K, V>`, except their type is explicitly defined with a "virtual type-system", called **Shapes**.

Shapes are an in-code abstraction for (and agnostic to) data and schema formats such as JSON Schema, Glue Tables, DynamoDB, and (soon) Avro, Protobuf, Parquet, Orc.

```ts
class NotificationRecord extends Record({
  key: string,
  count: integer
    .apply(Minimum(0)), // apply a Trait to constrain the value of this integer
  timestamp,
  tags: optional(array(string()))
}) {}

const topic = new SNS.Topic(stack, 'Topic', {
  // "shape" of data in the SNS Topic
  shape: NotificationRecord
});
```

This Topic's Shape is now encoded in its type definition:

```ts
SNS.Topic<NotificationRecord>
```

So, a type-safe interface can also be derived at runtime:

```ts
async function publish(notification: NotificationRecord): Promise<AWS.SNS.PublishResponse>;
```

As opposed to the un-safe opaque types when using the low-level AWS SDK:

```ts
async function publish(request: {
  TopicArn: string;
  Message: string | Buffer;
  // etc.
})
```

That type-machinery is achieved by mapping a `Shape` to its `Value` (the representation at runtime). It should look and feel like an in-memory array:

```ts
Array<NotificationRecord>;
```

# Validation and Serialization
The framework makes use of Shapes to type-check your code against its schema and safely serialize and deserialize values at runtime. The application code is only concerned with a deserialized and validated value, and so the system is protected from bad data at both *compile time* and *runtime*.

For reference, the above Topic's Shape:
```ts
class NotificationRecord extends Record({
  key: string,
  count: integer
    .apply(Minimum(0)),
  timestamp,
  tags: optional(array(string()))
}) {}
```

Is the same as this JSON Schema:

```json
{
  "type": "object",
  "properties": {
    "key": {
      "type": "string"
    },
    "count": {
      "type": "integer",
      "maximum": 10
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "key",
    "count",
    "timestamp"
  ]
}
```

# Data Types

Shapes are a format-agnostic Data Definition Language (DDL) for JSON, Glue (Hive SQL), (and soon) Avro, Orc and Parquet. For example, the Topic's Shape maps to this Glue Table Schema:
```sql
create table myTable(
  key string,
  count int,
  timestamp timestamp,
  tags array<string>
)
```

Below is a table of supported Data Types with their corresponding mappings to different domains:

| Shape             | Runtime      | JSON Schema       | Dynamo        | Glue       | Usage
|-------------------|--------------|-------------------|---------------|------------|-----------
| `BooleanShape`     | `boolean`    | `boolean`         | `BOOL`        | `boolean`  | `boolean`
| `TimestampShape`   | `string`     | `string` (format: `date-time`)    | `S`        | `timestamp`   | `timestamp`
| `BinaryShape`      | `Buffer`     | `string`<br>(contentEncoding: `base64`) | `B`  | `binary` | `binary`
| `StringShape`      | `string`     | `string`          | `S`           | `string`   | `string`
| `IntegerShape`     | `number`     | `integer`         | `N`           | `int`      | `integer`
| `BigIntShape`      | `number`     | `integer`         | `N`           | `bigint`   | `bigint`
| `SmallIntShape`    | `number`     | `integer`         | `N`           | `smallint` | `smallint`
| `TinyIntShape`     | `number`     | `integer`         | `N`           | `tinyint`  | `tinyint`
| `FloatShape`       | `number`     | `number`          | `N`           | `float`    | `float`
| `DoubleShape`      | `number`     | `number`          | `N`           | `double`   | `double`
| `ArrayShape<T>`    | `Array<T>`   | `array`           | `L`           | `array`    | `array(string`
| `SetShape<T>`      | `Set<T>`     | `array`<br>(uniqueItems: `false`) | `SS`<br>`NS`<br>`BS`<br>`L` | `array` | `set(string`
| `MapShape<T>`      | `{[K: string]: T}` | `object`<br>(additionalProperties: `true`) | `M` | `map<string, V>` | `map(string`
| `UnknownShape`      | `unknown`    | `{}`      | ([AWS Document Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html)) | `Error` | `unknown`
| `AnyShape`| `any`    | `{}`      | ([AWS Document Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html)) | `Error` | `any`

# Next
Shapes form the foundation on which DSLs are built for interacting with services. This is best demonstrated with AWS DynamoDB.

Next: [Dynamic (and safe) DynamoDB DSL](5-dynamodb-dsl.md)