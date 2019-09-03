## Punchcard

Punchcard is a TypeScript framework for building cloud applications atop the [AWS CDK](https://github.com/aws/aws-cdk). It unifies **Infrastructure Code** with **Runtime Code**, meaning you can both declare resources and implement logic within the context of one node.js application. AWS resources are thought of as generic, type-safe objects — DynamoDB Tables are like a `Map<K, V>`; SNS Topics, SQS Queues, and Kinesis Streams feel like an `Array<T>`; and a Lambda Function is akin to a `Function<A, B>` – like the standard library of a programming language.

## Resources 

* https://github.com/sam-goodwin/punchcard
* [Punchcard Developer Guide](https://github.com/sam-goodwin/punchcard/blob/master/docs/index.md) - learn how to use Punchcard.
* [Punchcard: Imagining the future of cloud programming](https://bit.ly/punchcard-cdk) - blog series exploring the philosophy behind this project.

## Hello, World!

Running code in AWS is almost as simple as running it locally!
```ts
export class HelloPunchcardStack extends cdk.Stack {
  public readonly topic: SNS.Topic<StringShape>;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.topic = new SNS.Topic(this, 'Topic', {
      shape: string()
    });

    Lambda.schedule(this, 'SendNotification', {
      rate: Schedule.rate(Duration.minutes(1)),
      depends: topic,
      handle: async(event, topic) => {
        await topic.publish('Hello, World!');
      }
    });

    const queue = topic.toSQSQueue(this, 'Queue');

    queue.messages().forEach(this, 'ForEachMessge', {
      handle: async(message) => console.log(`message '${message}' has length ${message.length}`);
    });
  }
}
```

## Example Stacks

* [Stream Processing](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/stream-processing.ts) - respond to SNS notifications with a Lambda Function; subscribe notifications to a SQS Queue and process them with a Lambda Function; process and forward data from a SQS Queue to a Kinesis Stream; sink records from the Stream to S3 and catalog it in a Glue Table.
* [Invoke a Function from another Function](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/invoke-function.ts) - call a Function from another Function
* [Real-Time Data Lake](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/data-lake.ts) - collects data with Kinesis and persists to S3, exposed as a Glue Table in a Glue Database.
* [Scheduled Lambda Function](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/scheduled-function.ts) - runs a Lambda Function every minute and stores data in a DynamoDB Table.
* [Pet Store API Gateway](https://github.com/sam-goodwin/punchcard/blob/master/examples/lib/pet-store-apigw.ts) - implementation of the [Pet Store API Gateway canonical example](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-from-example.html).

## License

This library is licensed under the Apache 2.0 License. 
