import { Core, DynamoDB, Lambda } from 'punchcard';

import { any, string, integer, Type, Minimum } from '@punchcard/shape';
import { CDK } from 'punchcard/lib/core/cdk';

export const app = new Core.App();
const stack = app.stack('invoke-function-example');

class TableRecord extends Type({
  id: string,
  count: integer
    .apply(Minimum(0)),
  anyProperty: any 
}) {}

const table = new DynamoDB.Table(stack, 'my-table', {
  data: TableRecord,
  key: {
    partition: 'id'
  },
  tableProps: CDK.map(({dynamodb}) => ({
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
  }))
});

class IncrementRequest extends Type({
  id: string
}) {}

// create a function that increments counts in a dynamodb table
// Function<IncrementRequest, number>
const incrementer = new Lambda.Function(stack, 'Callable', {
  request: IncrementRequest,
  response: integer,

  depends: table.readWriteAccess(),
}, async (request, table) => {
  console.log(request);
  const item = await table.get({
    id: request.id
  });

  let newCount: number;
  if (item) {
    newCount = item.count + 1;
    await table.update({
      id: request.id
    }, {
      actions: item => [
        item.count.increment(1),
      ]
    });
  } else {
    newCount = 1;
    await table.put(new TableRecord({
      id: request.id,
      count: 1,
      anyProperty: {
        this: 'property can be any type supported by the AWS.DynamoDB.DocumentClient',
      }
    }), {
      if: _ => _.id.notExists()
    });
  }
  return newCount;
});

// call the incrementer function from another Lambda Function
Lambda.schedule(stack, 'Caller', {
  schedule: Lambda.Schedule.rate(Core.Duration.minutes(1)),
  depends: incrementer.invokeAccess(),
}, async (_, incrementer) => {
  const newCount = await incrementer.invoke(new IncrementRequest({
    id: 'id'
  }));
  console.log(`new count of 'id' is ${newCount}`);
});