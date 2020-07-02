import { Core, DynamoDB, Lambda } from 'punchcard';

import { array, string, integer, Type, any, Shape, Minimum } from '@punchcard/shape';
import { CDK } from 'punchcard/lib/core/cdk';

export const app = new Core.App();
const stack = app.stack('invoke-function');

class Struct extends Type({
  key: string,
  number: integer
}) {}

class Item extends Type({
  id: string,
  count: integer
    .apply(Minimum(0)),
  name: string,
  array: array(string),
  struct: Struct,
  any
}) {}

// the type can be inferred, but we explicitly define them to illustrate how it works
// 'id' is the partitionKey, undefined is the sortKey (no sort key), and Item is the attributes of data in the table
const table = new DynamoDB.Table(stack, 'hash-table', {
  data: Item,
  key: {
    partition: 'id'
  },
  tableProps: CDK.map(({dynamodb}) => ({
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
  }))
});

// 'count' is the sortKey in this case
const sortedTable = new DynamoDB.Table(stack, 'sorted-table', {
  data: Item, 
  key: {
    partition: 'id',
    sort: 'count' 
  },
  tableProps: CDK.map(({dynamodb}) => ({
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
  }))
});

// call the incrementer function from another Lambda Function
Lambda.schedule(stack, 'Caller', {
  depends: Core.Dependency.concat(table.readWriteAccess(), sortedTable.readAccess()),
  schedule: Lambda.Schedule.rate(Core.Duration.minutes(1)),
}, async (_, [table, sortedTable]) => {
  await table.get({
    id: 'id'
  });

  await table.put(new Item({
    // the item is type-safe and well structured
    id: 'id',
    count: 1,
    name: 'name',
    any: {
      a: 'value'
    },
    array: ['some', 'values'],
    struct: new Struct({
      key: 'value',
      number: 1
    })
  }), {
    if: item =>
      // condition expressions are generated with a nice type-safe DSL
      item.count.equals(0)
      // .or(DynamoDB.not(item.count.greaterThan(0))) 
      .and(
        // string
        item.name.equals('name'),
        item.name.length.equals(4))
      .and(
        // arrays
        item.array.length.greaterThan(0),
        item.array.equals(['a', 'b']),
        item.array[0].equals('a'))
      .and(
        // structs
        item.struct.equals(new Struct({
          key: 'value',
          number: 1
        })),
        item.struct.fields.key.equals('value'),
        item.struct.fields.key.length.greaterThanOrEqual(5),
        item.struct.fields.number.lessThan(0))
      .and(
        // the dynamic type is casted to a static type before building a condition expression
        item.any
          .as(string)
          .equals('value'),
        item.any.as(integer).greaterThanOrEqual(1),
        item.any.as(array(integer)).equals([1]),
        item.any.as(array(integer))[0].lessThanOrEqual(1),
        item.any.as(Struct).equals(new Struct({
          key: 'value',
          number: 1
        })))
  });

  await table.update({
    id: 'id'
  }, {
    actions: _ => [
      // strings
      _.name.set('name'), // item.name = 'name'

      // numbers
      _.count.set(1), // item.count = 1
      _.count.decrement(1), // item.count -- or item.count -= 1
      _.count.increment(1), // item.count += 1
      _.count.set(_.count.plus(1)), // explicitly: item.count += 1
      
      // structs
      _.count.set(_.struct.fields.number), // item.count = item.struct.number
      _.struct.set(new Struct({ // item.struct = { 
        key: 'value',              //   key: 'value',
        number: 1                  //   number: 1
      })),                         // }
      _.struct.fields.key.set('value'), // item.struct.key = 'value'

      // arrays
      _.array.set(['some', 'values']), // item.array = ['some', 'values']
      _.name.set(_.array[0]), // item.name = item.array[0]
      _.array[1].set('value'), // item.array[0] = 'value'
      _.array[1].set(_.name), // item.array[0] = item.name
    ], 
    if: item => item.id.exists(),
  });

  // sorted tables can be queried
  await sortedTable.query({
    id: 'id', 
    count: _ => _.greaterThan(1)
  }, {
    filter: item => item.array.length.equals(item.count) // item.array.lenth === item.count
  });
});