## Punchcard

Punchcard is an opinionated, high-level framework for building cloud-native applications on AWS with the [AWS Cloud Development Kit (CDK)](https://github.com/awslabs/aws-cdk). You create and use ordinary data structures that are backed by CDK `Constructs` and deployed to AWS CloudFormation. It creates a type-safe development experience that feels like local in-memory programming, but runs in the AWS cloud!

## Snippet

The below snippet should give you a feel for the `punchcard` developer experience:

```ts
// create a standard aws-cdk App and Stack
const app = new cdk.App();
export default app;
const stack = new cdk.Stack(app, 'topic-and-queue');

// create a SNS Topic
const topic = new Topic(stack, 'Topic', {
  // all data structures have well-defined types
  type: struct({
    key: string(),
    count: integer()
  })
});

topic.forEach(stack, 'ForEachNotification', async event => {
  // do something in a Lambda Function for each notification
  console.log('got notification');
})

// forward notifications to a SQS queue
const queue = topic.toQueue(stack, 'Queue');

// forward data from the Queue to a Kinesis stream, because why not?
const stream = queue.toStream(stack, 'Stream');

// process data in stream, using familiar map and forEach operations
stream
  .map(async v => v.count)
  .forEach(stack, 'ParseNumbers', async number => console.log(number));

// publish a dummy SNS message every minute
λ().schedule(stack, 'DummyData', {
  clients: {
    // we need a client to the `topic` resource to publish SNS messages
    topic
  },
  rate: Rate.minutes(1),
  handle: async (_, {topic}) => {
    // a client instance for the topic will then be passed to your handler
    await topic.publish({
      Message: {
        key: 'some-key',
        count: 1
      }
    });
  }
});
```

## [Examples]([examples](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib))
* [SNS Topic and SQS Queue](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/topic-and-queue.ts) - respond to SNS notifications with a Lambda Function; subscribe notifications to a SQS Queue and process them with a Lambda Function.
* [Invoke a Function from another Function](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/invoke-function.ts) - call a Function from another Function
* [Real-Time Data Lake](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/data-lake.ts) - collects data with Kinesis and persists to S3, exposed as a Glue Table in a Glue Database.
* [Scheduled Lambda Function](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/scheduled-function.ts) - runs a Lambda Function every minute and stores data in a DynamoDB Table.
* [Pet Store API Gateway](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/pet-store-apigw.ts) - implementation of the [Pet Store API Gateway canonical example](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-from-example.html).

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
