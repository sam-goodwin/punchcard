import cdk = require('@aws-cdk/cdk');

import { LambdaExecutorService, Rate } from 'punchcard';

const app = new cdk.App();
export default app;

const stack = new cdk.Stack(app, 'invoke-function');

// Print hello world once per minute.
new LambdaExecutorService().schedule(stack, 'HelloWorld', {
  rate: Rate.minutes(1),
  clients: {},
  handle: async () => {
    console.log('Hello, World');
  }
})