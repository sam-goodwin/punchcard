![CodeBuild badge](https://codebuild.us-west-2.amazonaws.com/badges?uuid=eyJlbmNyeXB0ZWREYXRhIjoiT1BiL0lLYk5SMmgvTjVsc2x5N1JMTm1jTVFDTXJ2UzF1ZTlhN2xESVVOWThza3lBbEZaejBrYm5kSDFoT0pWUTlxR1IrTnRIWE9mZGVuS0d1RXJlUHU4PSIsIml2UGFyYW1ldGVyU3BlYyI6IjFjRTg3WjJ1a2ZhNDBqVVIiLCJtYXRlcmlhbFNldFNlcmlhbCI6MX0%3D&branch=master)
[![Gitter](https://badges.gitter.im/punchcard-cdk/community.svg)](https://gitter.im/punchcard-cdk/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
[![npm version](https://badge.fury.io/js/punchcard.svg)](https://badge.fury.io/js/punchcard)

## Punchcard

Punchcard is a TypeScript framework for building cloud applications atop the [AWS CDK](https://github.com/aws/aws-cdk). It unifies **Infrastructure Code** with **Runtime Code**, meaning you can both declare resources and implement logic within the context of one node.js application. AWS resources are thought of as generic, type-safe objects — DynamoDB Tables are like a `Map<K, V>`; SNS Topics, SQS Queues, and Kinesis Streams feel like an `Array<T>`; and a Lambda Function is akin to a `Function<A, B>` – like the standard library of a programming language.

Running code in AWS is almost as simple as running it locally!
```ts
export class HelloPunchcardStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const topic = new SNS.Topic(this, 'Topic', {
      type: string()
    });

    new Lambda.ExecutorService().schedule({
      rate: Schedule.rate(Duration.minutes(1)),
      depends: topic,
      handle: async(topic) => {
        await topic.publish('Hello, World!');
      }
    });

    const queue = topic.toSQSQueue(this, 'Queue');

    queue.messages().forEach(this, 'ForEachMessge', {
      handle: async(message) => console.log('message length' + message.length)
    });
  }
}
```

## Resources 

* [Punchcard Concepts](docs/index.md) - dives deep into concepts and use-cases.
* [Punchcard: Imagining the future of cloud programming](https://bit.ly/punchcard-cdk) - explores the philosophy behind this project.
* [Example Stacks](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib)
  * [Stream Processing](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/stream-processing.ts) - respond to SNS notifications with a Lambda Function; subscribe notifications to a SQS Queue and process them with a Lambda Function; process and forward data from a SQS Queue to a Kinesis Stream; sink records from the Stream to S3 and catalog it in a Glue Table.
  * [Invoke a Function from another Function](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/invoke-function.ts) - call a Function from another Function
  * [Real-Time Data Lake](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/data-lake.ts) - collects data with Kinesis and persists to S3, exposed as a Glue Table in a Glue Database.
  * [Scheduled Lambda Function](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/scheduled-function.ts) - runs a Lambda Function every minute and stores data in a DynamoDB Table.
  * [Pet Store API Gateway](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/pet-store-apigw.ts) - implementation of the [Pet Store API Gateway canonical example](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-from-example.html).

# Getting Started 

This library is built with (and relies on) the AWS CDK, so you'll want to be familiar with the [CDK Concepts](https://docs.aws.amazon.com/cdk/latest/guide/what-is.html) and [Punchcard Concepts]().

Init a new NPM package.
```bash
npm init
```

Install `punchcard` and the `aws-cdk`:

```bash
npm install --save-dev typescript
npm install --save-dev aws-cdk
npm install @aws-cdk/core
npm install @aws-cdk/aws-events
npm install punchcard
```

Create an `index.ts` file to contain your application's entrypoint.

```ts
import cdk = require('@aws-cdk/core');
import { Schedule } from '@aws-cdk/aws-events';
import { Lambda } from 'punchcard';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'MyStack');

// NOTE: make sure you export the app as default, or else your code won't run at runtime.
export default app;

new Lambda.ExecutorService().schedule(stack, 'MyFunction', {
  schedule: Schedule.rate(cdk.Duration.minutes(1)),
  handle: async() => console.log('Hello, World!')
});
```

This app schedules a Lambda Function to print `"Hello, World"` every minute. To deploy it to CloudFormation, compile the code and run `cdk deploy`:

```bash
./node_modules/.bin/tsc
./node_modules/aws-cdk/bin/cdk deploy -a ./index.js
```

## Getting Fancy

Going beyond the "Hello, World" example, it is just as quick to stand up some more interesting infrastructure. The below code stands up a real-time stream of data from a Kinesis Stream to a queryable Glue Table in S3:
```ts
const database = new glue.Database(stack, 'Database', {
  databaseName: 'punchcard'
});

const stream = new Kinesis.Stream(stack, 'Stream', {
  type: struct({
    key: string(),
    timestamp
  })
});

const table = stream
  .toFirehoseDeliveryStream(stack, 'ToS3').batches()
  .toGlueTable(stack, 'ToGlue', {
    database: database,
    tableName: 'my-table',
    columns: {
      key: string(),
      timestamp
    },
    partition: {
      keys: {
        year: integer(),
        month: integer(),
        day: integer(),
        hour: integer(),
        minute: integer()
      },
      get(record) {
        const ts = record.timestamp;
        return {
          year: ts.getUTCFullYear(),
          month: ts.getUTCMonth(),
          day: ts.getUTCDate(),
          hour: ts.getUTCHours(),
          minute: ts.getUTCMinutes()
        };
      }
    }
  });
```

## License

This library is licensed under the Apache 2.0 License. 
