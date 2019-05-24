import cdk = require('@aws-cdk/cdk');
import { integer, string, struct, Topic, Rate, λ } from 'punchcard';

const app = new cdk.App();
export default app;
const stack = new cdk.Stack(app, 'topic-and-queue');

// create a SNS Topic
const topic = new Topic(stack, 'Topic', {
  // all data structures in punchcard have well-defined static types
  type: struct({
    key: string(),
    count: integer()
  })
});

topic.forEach(stack, 'ForEachNotification', async event => {
  // do something in a Lambda Function for each notification
  console.log('got notification');
});

// forward notifications to a SQS queue
const queue = topic.toQueue(stack, 'Queue');

// forward data from the Queue to a Kinesis stream, because why not? it's pretty easy ...
const stream = queue.toStream(stack, 'Stream');

// process data in stream, using familiar map and forEach operations
stream
  .flatMap(async vs => vs)
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
