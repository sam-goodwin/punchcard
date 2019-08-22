import { BillingMode } from '@aws-cdk/aws-dynamodb';
import cdk = require('@aws-cdk/core');
import { Duration } from '@aws-cdk/core';
import { Schedule } from '@aws-cdk/aws-events';

import { dynamic, DynamoDB, integer, Lambda, string, struct, array, Dependency } from 'punchcard';

const app = new cdk.App();
export default app;

const stack = new cdk.Stack(app, 'invoke-function');

const executorService = new Lambda.ExecutorService({
  timeout: cdk.Duration.seconds(10)
});

const table = new DynamoDB.Table(stack, 'my-table', {
  partitionKey: 'id',
  shape: {
    id: string(),
    count: integer({
      minimum: 0
    }),
    name: string(),
    array: array(string()),
    struct: struct({
      key: string()
    }),
    any: dynamic
  },
  billingMode: BillingMode.PAY_PER_REQUEST
});

const sortedTable = new DynamoDB.Table(stack, 'my-table', {
  partitionKey: 'id',
  sortKey: 'count',
  shape: {
    id: string(),
    count: integer(),
    struct: struct({
      key: string()
    })
  },
  billingMode: BillingMode.PAY_PER_REQUEST
});


// call the incrementer function from another Lambda Function
executorService.schedule(stack, 'Caller', {
  depends: Dependency.list(table, sortedTable),
  schedule: Schedule.rate(Duration.minutes(1)),
  handle: async (_, [table, sortedTable]) => {
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
          key: 'value'
        }
      },
      // condition expressions are generated with a nice type-safe DSL
      if: item => item.count.eq(1)
        .and(item.array.get(0).eq('some'))
        .and(item.struct.eq({
          key: 'value'
        }))
        .and(item.struct.fields.key.greaterThan('value'))
        // the any type is casted to a static type before building a condition expression
        .and(item.any.as(string()).lessThan('value'))
        .and(item.any.as(integer()).greaterThanOrEqual(1))
        .and(item.any.as(array(integer())).equals([1]))
        .and(item.any.as(array(integer())).get(0).lessThanOrEqual(1))
        .and(item.any.as(struct({
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
        // set strings
        item.name.set('name'),
        // increement/decrement numbers
        item.count.increment(1),
        item.count.decrement(1),

        item.struct.set({ // set the entire struct
          key: 'value'
        }),
        item.struct.fields.key.set('value'), // set a field on the struct

        item.array.set(['some', 'values']), // set the entire array
        item.array.get(1).set('value') // set a specific index
      ],
      if: item => DynamoDB.attribute_exists(item.id)
    });

    // sorted tables can be queried
    await sortedTable.query({
      key: {
        id: 'id',
        count: DynamoDB.greaterThan(1)
      },
      filter: item => item.struct.equals({
        key: 'value'
      })
    });
  }
});