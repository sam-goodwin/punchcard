## Punchcard

Punchcard is an opinionated, high-level framework for building cloud-native applications on AWS with the [AWS Cloud Development Kit (CDK)](https://github.com/awslabs/aws-cdk). You create and use ordinary data structures that are backed by CDK `Constructs` and deployed to AWS CloudFormation. It creates a type-safe development experience that feels like local in-memory programming, but runs in the AWS cloud!

## [Examples](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib)

* [SNS Topic and SQS Queue](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/topic-and-queue.ts) - respond to SNS notifications with a Lambda Function; subscribe notifications to a SQS Queue and process them with a Lambda Function.
* [Invoke a Function from another Function](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/invoke-function.ts)
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

Export the `app` as `default` from the bin/app.ts

```ts
// ./bin/app.ts
const app = new cdk.App();
new TestStack(app, 'TestStack');

export default app;
```

And, simply use `punchcard` constucts in your stacks:

```ts
// ./lib/app-stack.ts
import cdk = require('@aws-cdk/cdk');
import punchcard = require('punchcard');

export class TestStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // print "Hello, World" every minute from Lambda
    new punchcard.LambdaExecutorService().schedule(this, 'Test', {
      rate: punchcard.Rate.minutes(1),
      handle: async () => {
        console.log('Hello, World');
      }
    });
  }
}
```

Compile your code and deploy the app to AWS via CloudFormation with the `cdk`:

```shell
npm run build
./node_modules/aws-cdk/bin/cdk deploy -a ./index.js
```

## License

This library is licensed under the Apache 2.0 License. 
