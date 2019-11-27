# Getting Started 

This library is built with (and relies on) the AWS CDK. If you're new to the CDK, the [CDK Docs](https://docs.aws.amazon.com/cdk/latest/guide/what-is.html) and the [TypeScript CDK Workshop](https://cdkworkshop.com/20-typescript.html) are good places to start.

Install `punchcard` and the `aws-cdk`:

```shell
npm install --save-dev aws-cdk
npm install @aws-cdk/core
npm install punchcard
```

Create an `index.ts` file to contain your application's entrypoint:

```ts
import cdk = require('@aws-cdk/core');
import { Schedule } from '@aws-cdk/aws-events';
import { Core, Lambda } from 'punchcard';

const app = new Core.App();

// Constructs are created laziliy by mapping "into the" Build context
const stack = app.root.map(app => new cdk.Stack(app, 'MyStack'));

Lambda.schedule(stack, 'MyFunction', {
  schedule: Schedule.rate(cdk.Duration.minutes(1)),
  handle: async() => console.log('Hello, World!')
});
```

This app schedules a Lambda Function to log out `"Hello, World"` every minute. To deploy it to CloudFormation, compile your code and run `cdk deploy`:

```shell
./node_modules/.bin/tsc
./node_modules/aws-cdk/bin/cdk deploy -a ./index.js
```

**Next**: [how to create Lambda Functions](2-creating-functions.md)