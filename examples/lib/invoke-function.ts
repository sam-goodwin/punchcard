import { BillingMode } from '@aws-cdk/aws-dynamodb';
import cdk = require('@aws-cdk/cdk');

import { attribute_not_exists, HashTable, integer, LambdaExecutorService, Rate, string, struct } from 'punchcard';

const app = new cdk.App();
export default app;

const stack = new cdk.Stack(app, 'invoke-function');

const executorService = new LambdaExecutorService({
  timeout: 10
});

// create a function that increments counts in a dynamodb table
const incrementer = executorService.spawn(stack, 'Callable', {
  clients: {
    table: new HashTable(stack, 'my-table', {
      partitionKey: 'id',
      shape: {
        id: string(),
        count: integer({
          minimum: 0
        })
      },
      billingMode: BillingMode.PayPerRequest
    })
  },
  // request contains the id to increment
  request: struct({
    id: string()
  }),
  // returns the new count (just an integer, no `struct` envelope this time)
  response: integer(),
  handle: async (request, {table}) => {
    console.log(request);
    const item = await table.get({
      id: request.id
    });

    let newCount: number;
    if (item) {
      await table.update({
        key: {
          id: request.id
        },
        actions: item => [
          item.count.increment(1),
        ],
      });
      newCount = item.count + 1;
    } else {
      await table.put({
        item: {
          id: request.id,
          count: 1
        },
        if: item => attribute_not_exists(item.id)
      });
      newCount = 1;
    }
    return newCount;
  }
});

// call the incrementer function from another Lambda Function every minute
executorService.schedule(stack, 'Caller', {
  clients: {
    incrementer
  },
  rate: Rate.minutes(1),
  handle: async (_, {incrementer}) => {
    const newCount = await incrementer.invoke({
      id: 'id'
    });
    console.log(`new count of 'id' is ${newCount}`);
  }
});