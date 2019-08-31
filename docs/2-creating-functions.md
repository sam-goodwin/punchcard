# Creating Functions

Creating a `Lambda.Function` is super simple - just instantiate it and implement `handle`:

```ts
new Lambda.Function(stack, 'MyFunction', {
  handle: async() => console.log('Hello, World!')
});
```
It supports all the same properties as the AWS CDK's [`@aws-cdk/aws-lambda.Function`](https://github.com/aws/aws-cdk/tree/master/packages/%40aws-cdk/aws-lambda), so you can configure things such as memory:

```ts
new Lambda.Function(stack, 'MyFunction', {
  handle: async() => console.log('Hello, World!'),
  memorySize: 512;
});
```

You can also schedule a new `Lambda.Function` to do some work:

```ts
Lambda.schedule(stack, 'MyFunction', {
  schedule: Schedule.rate(Duration.minutes(1)),
  handle: async() => console.log('Hello, World!'),
});
```

**Next**: we'll explore how to interact with other Constructs from your Function by declaring [Runtime Dependencies](3-runtime-dependencies.md)