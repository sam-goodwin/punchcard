# Runtime Dependencies

To contact other services in your Function, data structures such as `SNS.Topic`, `SQS.Queue`, `DynamoDB.Table`, etc. are declared as a runtime **Dependency**.

First, create the Construct you want to access from Lambda, say a `SQS.Queue`:
```ts
const queue = new SQS.Queue(stack, 'MyQueue', {
  type: string()
});
```

Then, depend on it when creating the `Lambda.Function`: 

```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: queue,
  // ..
});
```

This will create the required IAM policies for your Function's IAM Role, add any environment variables for details such as a Resource's ARN, and automatically create a client for accessing the `Construct` at runtime.

The result is that your `handle` function is now passed a client instance which you can interact with.

```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: queue,
  handle: async (event, queue) => {
    await queue.sendMessage('Hello, World!');
  }
});
```

By depending on the Queue, we granted the Function's IAM Role blanket read/write access (`sqs:SendMessage` and `sqs:ReceiveMessage`), when we only needed permission to send. To narrow permissions, depend on the specific level of permissions you need:

```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: queue.sendAccess(), // we only need sendAccess
  // ..
});
```

## Type Signatures

A Function's Runtime Dependencies are encoded in the type signature. Ordinarily, a Function's signature would be `Function<T, U>` (read: "a function from `T` to `U`"), but there's a third argument in Punchcard to capture the runtime dependencies, `Function<T, U, D extends Dependency<any>` (read: "a function from `T` to `U` with runtime dependency `D`").

In our example, the Queue had type:
```ts
SQS.Queue<StringType>
```

Which implements "a `Dependency` on an `SQS.Client` for sending and receiving `StringType` messages" :
```ts
Dependency<SQS.Client<StringType>>;
```

Resulting in a Function taking a `CloudWatch.Event` payload and returning an `any`, with a Dependency on an `SQS.Client` with messages of type `StringType`.

```ts
Lambda.Function<
  CloudWatch.Event,      // T
  any,                   // U
  SQS.Client<StringType> // D
>;
```

## Combinators

The type of a Function's Dependency is restricted to one `D`, but you can compose multiple Dependencies into one type with the following combinators:
* `Dependency.tuple` - a tuple of Dependencies.
```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: Dependency.tuple([
    queue.sendAccess(),
    topic
  ]),
  handle: async (event, [queue, topic]) => {
    await queue.sendMessage('Hello, SQS!');
    await topic.publish('Hello, SNS!');
  }
});
// is of type
Lambda.Function<any, any, Dependency.Tuple<[
  SQS.ReadClient<StringType>,
  SNS.Client<StringType>,
]>>
```
* `Dependency.named` - a set of explicitly named Dependencies (key-value pairs)
```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: Dependency.named({
    queue: queue.sendAccess(),
    topic
  }),
  handle: async (event, ({queue, topic})) => {
    await queue.sendMessage('Hello, SQS!');
    await topic.publish('Hello, SNS!');
  }
});
// is of type
Lambda.Function<any, any, Dependency.Named<{
  queue: SQS.ReadClient<StringType>,
  topic: SNS.Client<StringType>,
}>>
```

## Next

You may have noticed something strange about the definition of our `SQS.Queue`:
```ts
const queue: SQS.Queue<StringType> = new SQS.Queue(this, 'Q', {
  type: string()
});
```

Why isn't it a `SQS.Queue<string>`? We'll answer this in the next section on [**Shapes**](4-shapes.md).
