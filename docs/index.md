# Punchcard

Punchcard is a TypeScript framework for building cloud applications with the [AWS CDK](https://github.com/aws/aws-cdk). It unifies **infrastructure** code with **runtime** code, meaning you can both declare resources and implement logic within the context of one node.js application. AWS resources are thought of as generic, type-safe objects — DynamoDB Tables are like a `Map<K, V>`; SNS Topics, SQS Queues, and Kinesis Streams feel like an `Array<T>`; and a Lambda Function is akin to a `Function<A, B>` – like the standard library of a programming language.

# Hello, World!

Running code in AWS is almost as simple as running it locally!
```ts
export class HelloPunchcardStack extends cdk.Stack {
  public readonly topic: SNS.Topic<StringShape>;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.topic = new SNS.Topic(this, 'Topic', {
      shape: string
    });

    Lambda.schedule(this, 'SendNotification', {
      rate: Schedule.rate(Duration.minutes(1)),
      depends: topic,
    }, async(event, topic) => {
      await topic.publish('Hello, World!');
    });

    const queue = topic.toSQSQueue(this, 'Queue');

    queue.messages().forEach(this, 'ForEachMessge', {},
      async(message) => {
        console.log(`message '${message}' has length ${message.length}`);
      });
  }
}
```

# Blog Series

If you'd like to learn more about the philosophy behind this project, check out my blog series (WIP) [Punchcard: Imagining the future of cloud programming](https://bit.ly/punchcard-cdk).

# Developer Guide

1. [Getting Started](1-getting-started.md)
2. [Creating Functions](2-creating-functions.md)
3. [Runtime Dependencies](3-runtime-dependencies.md)
4. [Shapes: Type-Safe Schemas](4-shapes.md)
5. [Dynamic (and safe) DynamoDB DSL](5-dynamodb-dsl.md)
6. [Stream Processing](6-stream-processing.md)
