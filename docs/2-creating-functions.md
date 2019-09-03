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

# Request and Response Shape
By default, the type of the request and response is `any`, but you can also explicitly define the types:
```ts
new Lambda.Function<string, number>(stack, 'MyFunction', {
  handle: async(str) => str.length
});
```

These types will be serialized to and from JSON based on their JS types (using `JSON.stringify`). To explicitly control the serialization, explicitly provide a **Shape** for the `request` and `response` properties.
```ts
// Lambda.Function<string, number>
new Lambda.Function(stack, 'MyFunction', {
  request: string(),
  response: integer(),
  handle: async(str) => str.length
});
```

Now, the Punchcard framework will validate and serialzie the request and response according to their "Shape". (*See Part 4 - [Shapes: Type-Safe Schemas](4-shapes.md)*).

# Scheduled Functions
You can schedule a new `Lambda.Function` to do some work:

```ts
Lambda.schedule(stack, 'MyFunction', {
  schedule: Schedule.rate(Duration.minutes(1)),
  handle: async(request: CloudWatch.Event) => console.log('Hello, World!'),
});
```

Note: how the the type of `request` is a `CloudWatch.Event`, as it is regularly triggered by a scheduled CloudWatch Event

# Next 
**Next**: we'll explore how to interact with other Constructs from your Function by declaring [Runtime Dependencies](3-runtime-dependencies.md)