# Runtime Dependencies

To contact other services in your Function, data structures such as `SNS.Topic`, `SQS.Queue`, `DynamoDB.Table`, etc. are declared as a runtime **Dependency**.

First, create the Construct you want to access from Lambda, like an `SQS.Queue`:
```ts
import { string } from '@punchcard/shape';

const queue = new SQS.Queue(stack, 'MyQueue', {
  shape: string // data type will be orindary strings
});
```

Then, depend on it when creating a `Lambda.Function`: 

```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: queue,
  // ..
});
```

This will grant the required IAM policies for your Function's IAM Role, add any environment variables for details such as the Queue's ARN, and create a client for accessing the `Construct` at runtime.

The result is that your `handle` function is now passed a `queue` client instance which you can interact with to send messages.

```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: queue,
}, async (event, queue) => {
  await queue.sendMessage('Hello, World!');
});
```

# Controlling Permissions

By depending on the Queue, we granted the Function's IAM Role read and write access (`sqs:SendMessage` and `sqs:ReceiveMessage`) to the Queue, when we really only needed permission to send messages. To narrow permissions, depend on the specific level of permissions you need:

```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: queue.sendAccess(),
  // ..
});
```

This Function's IAM role now only has permission to `sqs:SendMessage`.

# Combinators
A `Lambda.Function` often requires access to multiple resources, not just one. You can compose multiple Dependencies into one type with the `tuple` and `named` combinators:
* `Dependency.tuple` - a tuple of Dependencies.
```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: Dependency.tuple(queue.sendAccess(), topic),
  handle: async (event, [queue, topic]) => {
    await queue.sendMessage('Hello, SQS!');
    await topic.publish('Hello, SNS!');
  }
});
```
* `Dependency.named` - a set of explicitly named Dependencies (key-value pairs)
```ts
new Lambda.Function(stack, 'MyFunction', {
  depends: Dependency.named({
    queue: queue.sendAccess(),
    topic
  }),
}, async (event, ({queue, topic})) => {
  await queue.sendMessage('Hello, SQS!');
  await topic.publish('Hello, SNS!');
});
```

# Type Signatures

A Function's Runtime Dependencies are encoded in the type signature.

Ordinarily, an in-memory Function's signature would be `Function<T, U>` (read: "a function from `T` to `U`"). In Punchcard, there's a third argument ,`D`, which captures the Function's runtime Dependencies, `Function<T, U, D extends Dependency<any>` (read: "a function from `T` to `U` with runtime Dependency `D`").

In our example, the Queue has type:
```ts
SQS.Queue<StringShape>
```

Which implements "a `Dependency` on an `SQS.Client` for sending and receiving `StringShape` messages" :
```ts
Dependency<SQS.Client<StringShape>>;
```

Resulting in this Function signature:

```ts
Lambda.Function<
  CloudWatch.Event,       // T - the cloud watch trigger event
  any,                    // U - the return type doesn't matter
  SQS.Client<StringShape> // D - runtime dependency on a Queue with String messages.
>;
```

The type signatures of composite dependencies read the same as how they're constructed:
```ts
const tupleDependency: Dependency.Tuple<[
  SQS.ReadClient<StringShape>,
  SNS.Client<StringShape>,
]> = Dependency.tuple(
  queue.readAccess(),
  topic
);

const namedDependency: Dependency.Named<{
  queue: SQS.ReadClient<StringShape>,
  topic: SNS.Client<StringShape>,
}> = Dependency.named({
  queue: queue.readAccess(),
  topic
}):
```

# Next

You may have noticed something strange about the definition of our `SQS.Queue`:
```ts
const queue: SQS.Queue<StringShape> = new SQS.Queue(this, 'Q', {
  shape: string
});
```

Why is it a `SQS.Queue<StringShape>` instead of `SQS.Queue<string>`? We'll explain what `StringShape` is in the next section on [**Shapes**](4-shapes.md).
