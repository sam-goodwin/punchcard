import {Core, DynamoDB, Lambda, SQS} from "punchcard";
import {Record, integer, string} from "@punchcard/shape";
import {Dependency} from "punchcard/lib/core";

export const app = new Core.App();
const stack = app.stack("hello-world");

/**
 * State of a counter.
 */
class Counter extends Record({
  /**
   * The hash key of the Counter
   */
  count: integer,
  /**
   * Integer property for tracking the Counter's count.
   */
  key: string,
}) {}

// create a table to store counts for a key
const hashTable = new DynamoDB.Table(stack, "Table", {
  data: Counter,
  key: {
    partition: "key",
  },
});

const queue = new SQS.Queue(stack, "queue", {
  shape: Counter,
});

// schedule a Lambda function to increment counts in DynamoDB and send SQS messages with each update.
Lambda.schedule(
  stack,
  "MyFunction",
  {
    depends: Dependency.concat(hashTable.readWriteAccess(), queue.sendAccess()),
    schedule: Lambda.Schedule.rate(Core.Duration.minutes(1)),
  },
  async (_, [hashTable, queue]) => {
    console.log("Hello, World!");

    // lookup the rate type
    let rateType = await hashTable.get({
      key: "key",
    });
    if (rateType === undefined) {
      rateType = new Counter({
        count: 0,
        key: "key",
      });
      // put it with initial value if it doesn't exist
      await hashTable.put(rateType);
    }

    await queue.sendMessage(rateType);

    // increment the counter by 1
    await hashTable.update(
      {
        key: "key",
      },
      {
        // @ts-ignore
        actions: (_) => [_.count.increment()],
      },
    );
  },
);

// print out a message for each SQS message received
queue.messages().forEach(stack, "ForEachMessage", {}, (msg) => {
  console.log(`received message with key '${msg.key}' and count ${msg.count}`);
  // todo: same issue described in "./src/data-lake.ts#50"
  return Promise.resolve();
});
