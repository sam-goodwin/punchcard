import cdk = require('@aws-cdk/core');
import { Schedule } from '@aws-cdk/aws-events';
import { Core, Lambda } from 'punchcard';

export const app = new Core.App();
const stack = app.root.map(app => new cdk.Stack(app, 'hello-world'));

Lambda.schedule(stack, 'MyFunction', {
  schedule: Schedule.rate(cdk.Duration.minutes(1))
}, async() => console.log('Hello, World!'));
