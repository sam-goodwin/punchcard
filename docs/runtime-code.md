
# Runtime Code and Dependencies

Creating a `Lambda.Function` is super simple - just instantiate it and implement `handle`:

```ts
new Lambda.Function(stack, 'MyFunction', {
  handle: async (event) => {
    console.log('hello world');
  }
});
```
Bam! You now have a Lambda Function running in AWS.

To contact other services in your Function, data structures such as `SNS.Topic`, `SQS.Queue`, `DynamoDB.Table`, etc. are declared as a runtime **Dependency**.

```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: topic,
  // <redacted>
});
```

This will create the required IAM policies for your Function's IAM Role, add any environment variables for details such as an SNS Topic's ARN, and automatically create a client for accessing the `Construct` at runtime. The result is that your `handle` function is now passed a client (`topic`) instance which you can interact with:

```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: topic,
  handle: async (event, topic) => {
    await topic.publish({
      key: 'some key',
      count: 1,
      timestamp: new Date(),
      tags : ['some', 'tags']
    });
  }
});
```

## Permission Boundaries

TODO: convention for permission boundary names