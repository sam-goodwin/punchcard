# @punchcard/shape-dynamodb

This library extends the Punchcard Shape Type-System to provide a high-level abstraction of the AWS DynamoDB service.

# Defining Data Types

The type of data in a Table is defined as a class with properties that represent its "Shape".

```ts
class Type extends Type({
  key: string;
  count: number;
  list: array(string);
}) {}
```

# Creating a Table Client

You then create a `Client` by passing the Type of data and the hash key and (optional) sort key.

```ts
import dynamodb = require('@punchcard/shape-dynamodb');

const hashKeyOnlyTable = new dynamodb.Client({
  tableName: 'my-table-name' // <- provide the table ARN or name
  data: Type,
  key: {
    // attribute to use as the partition key
    partition: 'key' // <- must be a keyof the data type
  }
});

// pass a tuple [keyof Type, keyof Type]
const sortedTable = new dynamodb.Client({
  tableName: 'my-table-arn',
  data: Type, 
  key: {
    partition: 'key',
    sort: 'count',
  }
});
```

Based on the type, `dynamodb.Client` provides a high-level DSL for conditional, update and query expressions.

# Conditional Expressions

`put` accepts an `if` lambda that constructs a conditional expression:

```ts
table.put(new MyType({..}), {
  // attribute_exists("key")
  if: _ => _.key.exists()
})
table.put(.., {
  if: _ => _.count.greaterThan(0)
});
table.put(.., {
  if: _ => _.count.greaterThan(0).and(_.count.lessThan(10)
});
table.put(.., {
  if: _ => _.list.equals([1, 2])
});
table.put(.., {
  // array index
  if: _ => _.list[0].equals(1)
});
table.put(.., {
  // equiv. to array index above
  if: _ => _.list.get(0).equals(1)
})
```

# Update Expressions

`update` accepts a lambda that constructs an array of "actions":

```ts
await table.update({
  key: 'key'
}, {
  actions: _ => [
    _.count.set(0), // count := 0
    _.count.set(_.count.plus(1)),
    // equiv to:
    _.count.increment(),
    // increment can be parameterized
    _.count.increment(10),

    _.array.set([1, 2]),
    _.array[0].set(1),
    _.array.push(0)
  ],
  // optional: conditional expression on the update
  if: _ => _.key.exists()
});
```

# Query Expressions

`query` is supported when there is a sort key. 

```ts
await table.query({
  // no condition on the sort key
  key: 'key'
});
await table.query({
  key: 'key', 
  // conditional query on the count
  count: _ => _.greaterThan(0)
})
```
