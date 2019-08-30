import cdk = require('@aws-cdk/core');
import { Schedule } from '@aws-cdk/aws-events';
import { Lambda } from 'punchcard';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'MyStack');

// NOTE: make sure you export the app as default, or else your code won't run at runtime
export default app;

Lambda.schedule(stack, 'MyFunction', {
  schedule: Schedule.rate(cdk.Duration.minutes(1)),
  handle: async() => console.log('Hello, World!')
});
