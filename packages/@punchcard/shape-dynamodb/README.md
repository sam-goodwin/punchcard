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

You then create a `Table` by passing the Type of data and the hash key and (optional) sort key.

```ts
const hashKeyOnlyTable = new Table(Type, 'key' /* must be a keyof Type */, {
  tableArn: 'my-table-arn' // <- provide the table ARN or name
});

// pass a tuple [keyof Type, keyof Type]
const sortedTable = new Table(Type, ['key', 'count'], {
  tableArn: 'my-table-arn'
});
```
