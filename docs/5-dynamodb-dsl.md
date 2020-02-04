# Dynamic (and safe) DynamoDB DSL

Punchcard uses TypeScript's [Advanced Types](https://www.typescriptlang.org/docs/handbook/advanced-types.html) to derive a DynamoDB DSL from [`Shapes`](#shapes). This DSL simplifies the code required to marshal and unmarshal items from the DynamoDB format and build [Condition](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html), [Query](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html) and [Update](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html) Expressions.

To demonstrate, let's create a `DynamoDB.Table` "with some Shape":
```ts
class TableRecord extends Record({
  id: string,
  count: integer
}) {}

const table = new DynamoDB.Table(stack, 'my-table', {
  key: 'id',
  attributes: TableRecord
  partitionKey: 'id',
}, Build.lazy(() => ({
  billingMode: BillingMode.PAY_PER_REQUEST
})));
```
# Table Type

The Table API is derived from the definition encoded within the `DynamoDB.Table` type, containing the partition key (`'id'`), sort key (`undefined`) and the `Shape` of an item.

```ts
DynamoDB.Table<TableRecord, 'id'>
```
This model enables a dynamic interface to DynamoDB while also maintaining type-safety.

# Get Item
When getting an item from DynamoDB, there is no need to use `AttributeValues` such as `{ S: 'my string' }`. You simply use ordinary javascript types:

```ts
const item = await table.get('state');
item.id; // string
item.count; // number
//item.missing // does not compile
```

# Put Item

Putting an item is as simple as putting to an ordinary `Map`.

```ts
await table.put(new TableRecord({
  id: 'state',
  count: 1,
  //invalid: 'value', // does not compile
}));
```

A **Condition Expression** can optionally be included with `if`:
```ts
await table.put(new TableRecord({
  id: 'state',
  count: 1
}), {
  if: _ => _.count.equals(0)
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

# Update Item

Build **Update Expressions** by assembling an array of `actions`:
```ts
await table.update('state', {
  actions: _ => [
    _.count.increment(1)
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

# Query

If you also specified a `sortKey` for your Table:
```ts
const table = new DynamoDB.Table(stack, 'my-table', {
  key: ['id', 'count'] // specify a sortKey with a tuple
  attributes: TableRecord
});
```

*(Where the Table type looks like this)*
```ts
DynamoDB.Table<TableRecord, ['id', 'count']>
```

Then, you can also build typesafe **Query Expressions**:

```ts
await table.query(['id', _ => _.greaterThan(1)]);
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

Check out the [DynamoDB example app](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/dynamodb.ts#L74) for more magic.

# Next

Next: [Stream Processing](6-stream-processing.md)
