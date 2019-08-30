# Creating Functions

Running code in AWS is almost as simple as running it locally! Just instantiate a new `Lambda.Function` and pass it the `handle` implementation:
```ts
new Lambda.Function(stack, 'MyFunction', {
  handle: async() => console.log('Hello, World!')
});
```

It supports all the same properties as the AWS CDK's [`@aws-cdk/aws-lamnda.Function`](https://github.com/aws/aws-cdk/tree/master/packages/%40aws-cdk/aws-lambda), so you can configure things such as memory:

```ts
new Lambda.Function(stack, 'MyFunction', {
  handle: async() => console.log('Hello, World!'),
  memorySize: 512;
});
```

Punchcard spawns many Functions relatively quickly, often in abstract ways on behalf of the user with sensible defaults. To tune these properties, Punchcard borrows the Executor Service model from other languages (such a Java). We think of Lambda Functions like we do Threads and Thread Pools locally, de-coupling the configuration of the Lambda Function from its implementation, without losing

```ts
const executor = new Lambda.ExecutorService({
  memorySize: 512
});
```

Which it uses to make its Functions.
```ts
executor.lambda(stack, 'MyFunction'. {
  handle: async() => console.log('Hello, World!')
});
```

**Next**: we'll explore how to interact with other Resources from your Function by declaring [Runtime Dependencies](3-runtime-dependencies.md)