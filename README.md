## Punchcard

Punchcard is an opinionated, high-level framework for building cloud-native applications on AWS with the [AWS Cloud Development Kit (CDK)](https://github.com/awslabs/aws-cdk). You create and use ordinary data structures that are backed by CDK `Constructs` and deployed to AWS CloudFormation. It creates a type-safe development experience that feels like local in-memory programming, but runs in the AWS cloud!

## Examples

The below snippet should give you a feel for the `punchcard` developer experience - it simply schedules an AWS Lambda Function to run every minute and update data stored in an AWS DynamoDB Table.

```ts
// Create a DynamoDB Table with a partitionKey (like a HashMap/HashTable)
const table = new HashTable(stack, 'my-table', {
  partitionKey: 'id',
  shape: { // shape of attributes stored in the table
    id: string(),
    count: integer({
      minimum: 0 // you can define constraints
    })
  }
});

// like a java ExecutorService, except it spawns Lambda Functions instead of Threads
const executorService = new LambdaExecutorService({
  memorySize: 256
});

executorService.schedule(stack, 'Poller', {
  clients: {
    // get a client for the DynamoDB Table at runtime
    // (grants permissions and adds the tableName as an environment variable)
    table
  },
  rate: Rate.minutes(1),
  handle: async (_, {table}) => {
    // implementation of the Lambda Function

    // you can now use the DynamoDB Table
    // Note: how the high-level interface for the Table corresponds to its definition
    const item = await table.get({
      id: 'state'
    });

    if (item) {
      await table.update({
        key: {
          id: 'state'
        },
        actions: item => [
          // translates to an UpdateExpression
          item.count.increment(1)
        ]
      });
    } else {
      await table.put({
        item: {
          id: 'state',
          count: 1
        },
        // translates to a ConditionExpression
        if: item => attribute_not_exists(item.id)
      });
    }
  }
});
```

See the more thorough [examples](examples/lib):
* [SNS Topic and SQS Queue](examples/lib/topic-and-queue.ts) - respond to SNS notifications with a Lambda Function; subscribe notifications to a SQS Queue and process them with a Lambda Function.
* [Scheduled Lambda Function](examples/lib/scheduled-function.ts) - runs a Lambda Function every minute and stores data in a DynamoDB Table.
* [Pet Store API Gateway](examples/lib/pet-store-apigw.ts) - implementation of the [Pet Store API Gateway canonical example](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-from-example.html).

## Getting Started 

This library is built with (and relies on) the AWS CDK, see their [documentation](https://docs.aws.amazon.com/cdk/latest/guide/what-is.html) before proceeding.

Initialize a CDK application:
```shell
cdk init app --language=typescript
```

Install `punchcard`:

```shell
npm install --save punchcard
```

Replace the stack contents:

```ts
import cdk = require('@aws-cdk/cdk');
import punchcard = require('punchcard');

const app = new cdk.App();
const stack = new cdk.Stack(app, 'CronStack');

// make sure you export the app as default, or else your code won't run at runtime
export default app;

// create and use punchcard constructs
const table = new punchcard.HashTable(stack, 'MyTable', {
  // ...
});
```

Compile your code and deploy the app with the `cdk`:

```shell
npm run build
./node_modules/aws-cdk/bin/cdk deploy -a ./index.js
```

## License

This library is licensed under the Apache 2.0 License. 
