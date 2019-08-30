# Punchcard Guide

Punchcard is a TypeScript framework for building cloud applications atop the [AWS CDK](https://github.com/aws/aws-cdk). It unifies **Infrastructure Code** with **Runtime Code**, meaning you can both declare resources and implement logic within the context of one node.js application. AWS resources are thought of as generic, type-safe objects — DynamoDB Tables are like a `Map<K, V>`; SNS Topics, SQS Queues, and Kinesis Streams feel like an `Array<T>`; and a Lambda Function is akin to a `Function<A, B>` – like the standard library of a programming language.

Running code in AWS is almost as simple as running it locally!
```ts
new Lambda.Function(stack, 'MyFunction', {
  handle: async() => console.log('Hello, World!')
});
```

* [Getting Started](getting-started.md)
* [Runtime Code and Dependencies](runtime-code.md)
* [Shapes: Type-Safe Schemas](shapes.md)
* [Dynamic (and safe) DynamoDB DSL](dynamodb-dsl.md)
* [Stream Processing](stream-processing.md)
