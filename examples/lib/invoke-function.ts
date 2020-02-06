import { BillingMode } from '@aws-cdk/aws-dynamodb';
import cdk = require('@aws-cdk/core');
import { Duration } from '@aws-cdk/core';
import { Schedule } from '@aws-cdk/aws-events';

import { Core, DynamoDB, Lambda } from 'punchcard';

import { any, string, integer, Record, Minimum } from '@punchcard/shape';
import { Build } from 'punchcard/lib/core/build';

export const app = new Core.App();
const stack = app.stack('invoke-function-example');

class TableRecord extends Record({
  id: string,
  count: integer
    .apply(Minimum(0)),
  anyProperty: any 
}) {}

const table = new DynamoDB.Table(stack, 'my-table', {
  data: TableRecord,
  key: 'id'
}, Build.of({
  billingMode: BillingMode.PAY_PER_REQUEST
}));

class IncrementRequest extends Record({
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
  const item = await table.get(request.id);

  let newCount: number;
  if (item) {
    newCount = item.count + 1;
    await table.update(request.id, {
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
  schedule: Schedule.rate(Duration.minutes(1)),
  depends: incrementer.invokeAccess(),
}, async (_, incrementer) => {
  const newCount = await incrementer.invoke(new IncrementRequest({
    id: 'id'
  }));
  console.log(`new count of 'id' is ${newCount}`);
});