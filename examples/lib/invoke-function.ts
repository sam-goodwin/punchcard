import { BillingMode } from '@aws-cdk/aws-dynamodb';
import cdk = require('@aws-cdk/core');
import { Duration } from '@aws-cdk/core';
import { Schedule } from '@aws-cdk/aws-events';

import { Core, DynamoDB, Lambda } from 'punchcard';

import { any, string, integer, Record } from '@punchcard/shape';
import { Build } from 'punchcard/lib/core/build';
import { Minimum } from '../../packages/@punchcard/shape-validation/lib';

export const app = new Core.App();
const stack = app.root.map(app => new cdk.Stack(app, 'invoke-function-example'));

class TableRecord extends Record({
  id: string,
  count: integer
    .apply(Minimum(0)),
  anyProperty: any 
}) {}

const table = new DynamoDB.Table(stack, 'my-table', TableRecord, 'id', Build.of({
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
    await table.update(request.id, item => [
      item.count.increment(1),
    ]);
    newCount = item.count + 1;
  } else {
    await table.putIf(new TableRecord({
      id: request.id,
      count: 1,
      anyProperty: {
        this: 'property can be any type supported by the AWS.DynamoDB.DocumentClient',
      }
    }), item => item.id.notExists());
    newCount = 1;
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