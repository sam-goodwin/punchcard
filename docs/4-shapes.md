# Shapes: Type-Safe Schemas

Data structures in punchcard are like ordinary collections such as an `Array<T>` or `Map<K, V>`, except their type is explicitly defined with a "virtual type-system", called **Shapes**:

```ts
const topic = new SNS.Topic(stack, 'Topic', {
  type: struct({
    key: string(),
    count: integer({
      maximum: 10
    }),
    timestamp,
    tags: optional(array(string()))
  })
});
```

The `topic` client interface is a type-safe and structured interface derived from "its Shape":

```ts
await topic.publish({
  key: 'some key',
  count: 1,
  timestamp: new Date(),
  tags : ['some', 'tags']
});
```

As opposed to the boiler-plate and opaque types when using the low-level AWS SDK:

```ts
const sns = new AWS.SNS();
const topicArn = process.env.TOPIC_ARN;

await sns.publish({
  TopicArn: topicArn,
  Message: JSON.stringify({
    key: 'some key',
    count: 1,
    timestamp: new Date().toISOString(),
    tags : ['some', 'tags']
  }),
})
```

That type-machinery is achieved by mapping a `Shape` to its `RuntimeShape` (the representation at runtime). In this case, the Topic's Shape is directly defined as a `struct` with a `string`, `integer`, `timestamp` and (optionally) an `array` of `strings`, and is encoded in the type for type-checking:

```ts
SNS.Topic<StructType<{
  key: StringType;
  count: IntegerType;
  timestamp: TimestampType;
  tags: OptionalType<ArrayType<StringType>>
}>>
```

Which should look and feel similar to an in-memory array:
```ts
Array<{
  key: string;
  count: number;
  timestamp: Date;
  tags?: string[] | undefined;
}>
```

# Validation and Serialization
Shapes are an in-code abstractions for (and agnostic to) data and schema formats such as JSON Schema, Glue Tables, DynamoDB, and (soon) Avro, Protobuf, Parquet, Orc.

The framework makes use of the Topic's Shape to check your code against its Schema and automatically (and safely) serialize and deserialize values at runtime. The application code is only concerned with a deserialized and validated value, and so the system is protected from bad data at both *compile time* and *runtime*.

For reference, the above Topic's Shape
```ts
struct({
  key: string(),
  count: integer({
    maximum: 10
  }),
  timestamp,
  tags: optional(array(string()))
})
```

... is the same as this JSON Schema:

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

Shapes do more than schema validation - they provide a common language through which orindary values are mapped to other formats - JSON, DynamoDB Attribute Values and Glue (Hive) Table Schemas.

Below is a table of supported Data Types with their corresponding mappings to different domains:

| Shape             | Runtime      | JSON Schema       | Dynamo        | Glue       | Usage
|-------------------|--------------|-------------------|---------------|------------|-----------
| `BooleanType`     | `boolean`    | `boolean`         | `BOOL`        | `boolean`  | `boolean`
| `TimestampType`      | `string`     | `string` (format: `date-time`) | `S`           | `timestamp`   | `timestamp`
| `BinaryType`      | `Buffer`     | `string`<br>(contentEncoding: `base64`) | `B`  | `binary` | `binary()`
| `StringType`      | `string`     | `string`          | `S`           | `string`   | `string()`
| `IntegerType`     | `number`     | `integer`         | `N`           | `int`      | `integer()`
| `BigIntType`      | `number`     | `integer`         | `N`           | `bigint`   | `bigint()`
| `SmallIntType`    | `number`     | `integer`         | `N`           | `smallint` | `smallint()`
| `TinyInt`         | `number`     | `integer`         | `N`           | `tinyint`  | `tinyint()`
| `FloatType`       | `number`     | `number`          | `N`           | `float`    | `float()`
| `DoubleType`      | `number`     | `number`          | `N`           | `double`   | `double()`
| `ArrayType<T>`    | `Array<T>`   | `array`           | `L`           | `array`    | `array(string())`
| `SetType<T>`      | `Set<T>`     | `array`<br>(uniqueItems: `false`) | `SS`<br>`NS`<br>`BS`<br>`L` | `array` | `set(string())`
| `MapType<T>`      | `{[K: string]: T}` | `object`<br>(additionalProperties: `true`) | `M` | `map<string, V>` | `map(string())`
| `StructType<T>`   | `{[K in keyof T]: T[K]}` | `object`<br>(additionalProperties: `false`) | `M` | `struct` | `struct({name: string()})`
| `Dynamic`         | `unknown`    | `{}`      | ([AWS Document Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html)) | `Error` | `dynamic`
| `UnsafeDynamic`     | `any`    | `{}`      | ([AWS Document Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html)) | `Error` | `unsafeDynamic`

# Next
Shapes form the foundation on which DSLs are built for interacting with services. This is best demonstrated with AWS DynamoDB.

Next: [Dynamic (and safe) DynamoDB DSL](5-dynamodb-dsl.md)