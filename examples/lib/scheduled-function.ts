import { BillingMode } from '@aws-cdk/aws-dynamodb';
import cdk = require('@aws-cdk/core');
import { Duration } from '@aws-cdk/core';
import { Schedule } from '@aws-cdk/aws-events';

import { Core, DynamoDB, Lambda } from 'punchcard';
import { integer, string } from 'punchcard/lib/shape';
import { Build } from 'punchcard/lib/core/build';

export const app = new Core.App();
const stack = app.root.map(app => new cdk.Stack(app, 'scheduled-function-example'));

const table = new DynamoDB.Table(stack, 'my-table', {
  partitionKey: 'id',
  sortKey: undefined,
  attributes: {
    id: string(),
    count: integer({
      minimum: 0
    })
  },
  tableProps: Build.lazy(() => ({
    billingMode: BillingMode.PAY_PER_REQUEST
  }))
});

Lambda.schedule(stack, 'Poller', {
  depends: table.readWriteAccess(),
  schedule: Schedule.rate(Duration.minutes(1)),
}, async (_, table) => {
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
});
