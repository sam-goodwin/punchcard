# Getting Started 

This library is built with (and relies on) the AWS CDK, so you'll want to be familiar with the [CDK Concepts](https://docs.aws.amazon.com/cdk/latest/guide/what-is.html).

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
import { Lambda } from 'punchcard';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'MyStack');

// NOTE: make sure you export the app as default, or else your code won't run at runtime.
export default app;

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

**Next**: [Creating Functions](2-creating-functions.md)