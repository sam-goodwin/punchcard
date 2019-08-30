# Punchcard Guide

Punchcard is a TypeScript framework for building cloud applications atop the [AWS CDK](https://github.com/aws/aws-cdk). It unifies **Infrastructure Code** with **Runtime Code**, meaning you can both declare resources and implement logic within the context of one node.js application. AWS resources are thought of as generic, type-safe objects — DynamoDB Tables are like a `Map<K, V>`; SNS Topics, SQS Queues, and Kinesis Streams feel like an `Array<T>`; and a Lambda Function is akin to a `Function<A, B>` – like the standard library of a programming language.

# Sections
* [Getting Started](1-getting-started.md)
* [Creating Functions](2-creating-functions.md)
* [Runtime Dependencies](3-runtime-dependencies.md)
* [Shapes: Type-Safe Schemas](4-shapes.md)
* [Dynamic (and safe) DynamoDB DSL](5-dynamodb-dsl.md)
* [Stream Processing](6-stream-processing.md)
