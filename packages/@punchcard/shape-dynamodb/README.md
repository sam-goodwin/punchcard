# @punchcard/shape-dynamodb

This library extends the Punchcard Shape Type-System to provide a high-level abstraction of the AWS DynamoDB service.

# Defining Data Types

The type of data in a Table is defined as a class with properties that represent its "Shape".

```ts
class Type extends Record({
  key: string;
  count: number;
  list: array(string);
}) {}
```

# Creating a Table Client

You then create a `Client` by passing the Type of data and the hash key and (optional) sort key.

```ts
import dynamodb = require('@punchcard/shape-dynamodb');

const hashKeyOnlyTable = new dynamodb.Client(Type, 'key' /* must be a keyof Type */, {
  tableArn: 'my-table-arn' // <- provide the table ARN or name
});

// pass a tuple [keyof Type, keyof Type]
const sortedTable = new dynamodb.Client(Type, ['key', 'count'], {
  tableArn: 'my-table-arn'
});
```

Based on the type, `dynamodb.Client` provides a high-level DSL for conditional, update and query expressions.

# Conditional Expressions

`putIf` accepts a lambda that constructs a conditional expression:

```ts
table.putIf(new MyType({..}), _ => _.key.exists()) // attribute_exists("key")
table.putIf(.., _ => _.count.greaterThan(0))
table.putIf(.., _ => _.count.greaterThan(0).and(_.count.lessThan(10))
table.putIf(.., _ => _.list.equals([1, 2]))
table.putIf(.., _ => _.list[0].equals(1)) // array index
table.putIf(.., _ => _.list.get(0).equals(1)) // equiv. to array index above
```

# Update Expressions

`update` accepts a lambda that constructs an array of "actions":

```ts
await table.update('key', _ => [
  _.count.set(0), // count := 0
  _.count.set(_.count.plus(1)),
  // equiv to:
  _.count.increment(),
  // increment can be parameterized
  _.count.increment(10),

  _.array.set([1, 2]),
  _.array[0].set(1),
  _.array.push(0)
]);
```

# Query Expressions

`query` is supported when there is a sort key. 

```ts
await table.query('key'); // no condition on the sort key
await table.query(['key', _ => _.count.greaterThan(0)]) // conditional query on the count
```
