import { Core, DynamoDB, Lambda } from 'punchcard';
import { integer, string, Type, Minimum } from '@punchcard/shape';
import { CDK } from 'punchcard/lib/core/cdk';

export const app = new Core.App();
const stack = app.stack('scheduled-function-example');

class CounterRecord extends Type({
  id: string,
  count: integer
    .apply(Minimum(0))
}) {}

const table = new DynamoDB.Table(stack, 'my-table', {
  data: CounterRecord, 
  key: {
    partition: 'id'
  },
  tableProps: CDK.map(({dynamodb}) => ({
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
  }))
});

Lambda.schedule(stack, 'Poller', {
  depends: table.readWriteAccess(),
  schedule: Lambda.Schedule.rate(Core.Duration.minutes(1)),
}, async (_, table) => {
  const item = await table.get({ id: 'state' });

  if (item) {
    await table.update({
      id: 'state'
    }, {
      actions: _ => [
        _.count.increment(1)
      ]
    });
  } else {
    await table.put(new CounterRecord({
      id: 'state',
      count: 1
    }), {
      if: _ => _.id.exists()
    });
  }
});
