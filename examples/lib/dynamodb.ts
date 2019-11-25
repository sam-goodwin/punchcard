import { BillingMode } from '@aws-cdk/aws-dynamodb';
import cdk = require('@aws-cdk/core');
import { Duration } from '@aws-cdk/core';
import { Schedule } from '@aws-cdk/aws-events';

import { Core, DynamoDB, Lambda } from 'punchcard';

import { array, dynamic, string, integer, struct } from 'punchcard/lib/shape';
import { Build } from 'punchcard/lib/core/build';

const app = Build.lazy(() => new cdk.App());
export default app;

const stack = app.map(app => new cdk.Stack(app, 'invoke-function'));

type Item = typeof Item;
const Item = {
  id: string(),
  count: integer({
    minimum: 0
  }),
  name: string(),
  array: array(string()),
  struct: struct({
    key: string(),
    number: integer()
  }),
  any: dynamic
}

// the type can be inferred, but we explicitly define them to illustrate how it works
// 'id' is the partitionKey, undefined is the sortKey (no sort key), and Item is the attributes of data in the table
const table: DynamoDB.Table<'id', undefined, Item> = new DynamoDB.Table(stack, 'hash-table', {
  partitionKey: 'id',
  attributes: Item,
  tableProps: Build.of({
    billingMode: BillingMode.PAY_PER_REQUEST
  })
});

// 'count' is the sortKey in this case
const sortedTable: DynamoDB.Table<'id', 'count', Item> = new DynamoDB.Table(stack, 'sorted-table', {
  partitionKey: 'id',
  sortKey: 'count',
  attributes: Item,
  tableProps: Build.of({
    billingMode: BillingMode.PAY_PER_REQUEST
  })
});

// call the incrementer function from another Lambda Function
Lambda.schedule(stack, 'Caller', {
  depends: Core.Dependency.concat(table.readWriteAccess(), sortedTable.readAccess()),
  schedule: Schedule.rate(Duration.minutes(1)),
  handle: async (event, [table, sortedTable]) => {
    await table.get({
      id: 'id',
    });

    await table.put({
      // the item is type-safe and well structured
      item: {
        id: 'id',
        count: 1,
        name: 'name',
        any: {
          a: 'value'
        },
        array: ['some', 'values'],
        struct: {
          key: 'value',
          number: 1
        }
      },
      // condition expressions are generated with a nice type-safe DSL
      if: item => item.count.eq(0)
        .or(DynamoDB.not(item.count.greaterThan(0))) 
        .and(
          // string
          item.name.equals('name'),
          item.name.length.equals(4))
        .and(
          // arrays
          item.array.length.greaterThan(0),
          item.array.equals(['a', 'b']),
          item.array.at(0).equals('a'))
        .and(
          // structs
          item.struct.eq({
            key: 'value',
            number: 1
          }),
          item.struct.fields.key.equals('value'),
          item.struct.fields.key.length.greaterThanOrEqual(5),
          item.struct.fields.number.lessThan(0))
        .and(
          // the dynamic type is casted to a static type before building a condition expression
          item.any
            .as(string())
            .lessThan('value'),
          item.any.as(integer()).greaterThanOrEqual(1),
          item.any.as(array(integer())).equals([1]),
          item.any.as(array(integer())).at(0).lessThanOrEqual(1),
          item.any.as(struct({
            key: string()
          })).eq({
            key: 'value'
          }))
    });

    await table.update({
      key: {
        id: 'id',
      },
      actions: item => [
        // strings
        item.name.set('name'), // item.name = 'name'
        // numbers
        item.count.set(1), // item.count = 1
        item.count.decrement(1), // item.count -- or item.count -= 1
        item.count.increment(1), // item.count += 1
        item.count.set(item.count.plus(1)), // explicitly: item.count += 1
        
        // structs
        item.count.set(item.struct.fields.number), // item.count = item.struct.number
        item.struct.set({ // item.struct = { 
          key: 'value',   //   key: 'value',
          number: 1       //   number: 1
        }),               // }
        item.struct.fields.key.set('value'), // item.struct.key = 'value'

        // arrays
        item.array.set(['some', 'values']), // item.array = ['some', 'values']
        item.name.set(item.array.at(0)), // item.name = item.array[0]
        item.array.at(1).set('value'), // item.array[0] = 'value'
        item.array.at(1).set(item.name), // item.array[0] = item.name
      ],
      if: item => DynamoDB.attribute_exists(item.id),
    });

    // sorted tables can be queried
    await sortedTable.query({
      key: {
        id: 'id',
        count: DynamoDB.greaterThan(1)
      },
      filter: item => item.array.length.equals(item.count) // item.array.lenth === item.count
    });
  }
});