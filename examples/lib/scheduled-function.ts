import { BillingMode } from '@aws-cdk/aws-dynamodb';
import cdk = require('@aws-cdk/cdk');

import { attribute_not_exists, HashTable, integer, LambdaExecutorService, Rate, string, size } from 'punchcard';

const app = new cdk.App();
export default app;

const stack = new cdk.Stack(app, 'scheduled-function-example');

const table = new HashTable(stack, 'my-table', {
  partitionKey: 'id',
  shape: {
    id: string(),
    count: integer({
      minimum: 0
    })
  },
  billingMode: BillingMode.PayPerRequest
});

const executorService = new LambdaExecutorService();

executorService.schedule(stack, 'Poller', {
  context: {
    table
  },
  rate: Rate.minutes(1),
  handle: async (_, {table}) => {
    const item = await table.get({
      id: 'state'
    });

    if (item) {
      await table.update({
        key: {
          id: 'state'
        },
        actions: item => [
          item.count.increment(1)
        ]
      });
    } else {
      await table.put({
        item: {
          id: 'state',
          count: 1
        },
        if: item => attribute_not_exists(item.id)
      });
    }
  }
});
