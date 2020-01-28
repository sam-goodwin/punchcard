import { BillingMode } from '@aws-cdk/aws-dynamodb';
import cdk = require('@aws-cdk/core');
import { Duration } from '@aws-cdk/core';
import { Schedule } from '@aws-cdk/aws-events';

import { Core, DynamoDB, Lambda } from 'punchcard';
import { Build } from 'punchcard/lib/core/build';
import { Minimum } from '../../packages/@punchcard/shape-validation/lib';
import { integer, string } from '@punchcard/shape';

export const app = new Core.App();
const stack = app.root.map(app => new cdk.Stack(app, 'scheduled-function-example'));

class TableData {
  id = string;
  count = integer
    .apply(Minimum(0))
}

const table = new DynamoDB.Table(stack, 'my-table', TableData, 'id', Build.lazy(() => ({
  billingMode: BillingMode.PAY_PER_REQUEST
})));

Lambda.schedule(stack, 'Poller', {
  depends: table.readWriteAccess(),
  schedule: Schedule.rate(Duration.minutes(1)),
}, async (_, table) => {
  const item = await table.get('state');

  if (item) {
    await table.update('state', item => [
      item.count.increment(1)
    ]);
  } else {
    await table.putIf({
      id: 'state',
      count: 1
    }, item => item.id.exists());
  }
});
