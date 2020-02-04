import { BillingMode } from '@aws-cdk/aws-dynamodb';
import cdk = require('@aws-cdk/core');
import { Duration } from '@aws-cdk/core';
import { Schedule } from '@aws-cdk/aws-events';

import { Core, DynamoDB, Lambda } from 'punchcard';

import { array, string, integer, Record, any, Shape, Minimum } from '@punchcard/shape';
import { Build } from 'punchcard/lib/core/build';

export const app = new Core.App();

const stack = app.root.map(app => new cdk.Stack(app, 'invoke-function'));

class Struct extends Record({
  key: string,
  number: integer
}) {}

class Item extends Record({
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
const table = new DynamoDB.Table(stack, 'hash-table', Item, 'id', Build.of({
  billingMode: BillingMode.PAY_PER_REQUEST
}));

// 'count' is the sortKey in this case
const sortedTable = new DynamoDB.Table(stack, 'sorted-table', Item, ['id', 'count'], Build.of({
  billingMode: BillingMode.PAY_PER_REQUEST
}));

// call the incrementer function from another Lambda Function
Lambda.schedule(stack, 'Caller', {
  depends: Core.Dependency.concat(table.readWriteAccess(), sortedTable.readAccess()),
  schedule: Schedule.rate(Duration.minutes(1)),
}, async (_, [table, sortedTable]) => {
  await table.get('id');

  await table.putIf(new Item({
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
  }), item =>
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
        item.any.as(Shape.of(Struct)).equals(new Struct({
          key: 'value',
          number: 1
        })))
  );

  await table.update('id', item => [
    // strings
    item.name.set('name'), // item.name = 'name'
    // numbers
    item.count.set(1), // item.count = 1
    item.count.decrement(1), // item.count -- or item.count -= 1
    item.count.increment(1), // item.count += 1
    item.count.set(item.count.plus(1)), // explicitly: item.count += 1
    
    // structs
    item.count.set(item.struct.fields.number), // item.count = item.struct.number
    item.struct.set(new Struct({ // item.struct = { 
      key: 'value',              //   key: 'value',
      number: 1                  //   number: 1
    })),                         // }
    item.struct.fields.key.set('value'), // item.struct.key = 'value'

    // arrays
    item.array.set(['some', 'values']), // item.array = ['some', 'values']
    item.name.set(item.array[0]), // item.name = item.array[0]
    item.array[1].set('value'), // item.array[0] = 'value'
    item.array[1].set(item.name), // item.array[0] = item.name
  ], //item => DynamoDB.attribute_exists(item.id),
  );

  // sorted tables can be queried
  await sortedTable.query(['id', count => count.greaterThan(1)], {
    filter: item => item.array.length.equals(item.count) // item.array.lenth === item.count
  });
});