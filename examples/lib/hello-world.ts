import cdk = require('@aws-cdk/core');
import { Schedule } from '@aws-cdk/aws-events';
import { Lambda } from 'punchcard';
import { Build } from 'punchcard/lib/core/build';

const app = Build.lazy(() => new cdk.App());
const stack = app.map(app => new cdk.Stack(app, 'MyStack'));

// NOTE: make sure you export the app as default, or else your code won't run at runtime
export default app;

Lambda.schedule(stack, 'MyFunction', {
  schedule: Schedule.rate(cdk.Duration.minutes(1)),
  handle: async() => console.log('Hello, World!')
});
