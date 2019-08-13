import { BillingMode } from '@aws-cdk/aws-dynamodb';
import cdk = require('@aws-cdk/core');

import { DynamoDB, integer, LambdaExecutorService, Rate, string } from 'punchcard';

const app = new cdk.App();
export default app;

const stack = new cdk.Stack(app, 'scheduled-function-example');

const table = new DynamoDB.HashTable(stack, 'my-table', {
  partitionKey: 'id',
  shape: {
    id: string(),
    count: integer({
      minimum: 0
    })
  },
  billingMode: BillingMode.PAY_PER_REQUEST
});

const executorService = new LambdaExecutorService();

executorService.schedule(stack, 'Poller', {
  depends: table,
  rate: Rate.minutes(1),
  handle: async (_, table) => {
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
        if: item => DynamoDB.attribute_not_exists(item.id)
      });
    }
  }
});
