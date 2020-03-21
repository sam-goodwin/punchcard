import {Core, DynamoDB, Lambda} from "punchcard";
import {Minimum, Record, any, integer, string} from "@punchcard/shape";
// import { Build } from 'punchcard/lib/core/build';
import {CDK} from "punchcard/lib/core/cdk";

export const app = new Core.App();
const stack = app.stack("invoke-function-example");

class TableRecord extends Record({
  anyProperty: any,
  count: integer.apply(Minimum(0)),
  id: string,
}) {}

const table = new DynamoDB.Table(stack, "my-table", {
  data: TableRecord,
  key: {
    partition: "id",
  },
  tableProps: CDK.map(({dynamodb}) => ({
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  })),
});

class IncrementRequest extends Record({
  id: string,
}) {}

// create a function that increments counts in a dynamodb table
// Function<IncrementRequest, number>
const incrementer = new Lambda.Function(
  stack,
  "Callable",
  {
    depends: table.readWriteAccess(),
    request: IncrementRequest,

    response: integer,
  },
  async (request, table) => {
    console.log(request);
    const item = await table.get({
      id: request.id,
    });

    let newCount: number;
    if (item) {
      newCount = item.count + 1;
      await table.update(
        {
          id: request.id,
        },
        {
          actions: (item) => [item.count.increment(1)],
        },
      );
    } else {
      newCount = 1;
      await table.put(
        new TableRecord({
          anyProperty: {
            this:
              "property can be any type supported by the AWS.DynamoDB.DocumentClient",
          },
          count: 1,
          id: request.id,
        }),
        {
          if: (_) => _.id.notExists(),
        },
      );
    }
    return newCount;
  },
);

// call the incrementer function from another Lambda Function
Lambda.schedule(
  stack,
  "Caller",
  {
    depends: incrementer.invokeAccess(),
    schedule: Lambda.Schedule.rate(Core.Duration.minutes(1)),
  },
  async (_, incrementer) => {
    const newCount = await incrementer.invoke(
      new IncrementRequest({
        id: "id",
      }),
    );
    console.log(`new count of 'id' is ${newCount}`);
  },
);
