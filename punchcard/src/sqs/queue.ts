import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as sqs from "@aws-cdk/aws-sqs";
import {
  AnyShape,
  Mapper,
  MapperFactory,
  Shape,
  Value,
  any,
} from "@punchcard/shape";
import {Sink, SinkProps, sink} from "../util/sink";
import AWS from "aws-sdk";
import {Build} from "../core/build";
import {CDK} from "../core/cdk";
import {Dependency} from "../core/dependency";
import {Event} from "./event";
import {Json} from "@punchcard/shape-json";
import {Messages} from "./messages";
import {Resource} from "../core/resource";
import {Run} from "../core/run";

export interface QueueProps<T extends Shape = AnyShape> {
  /**
   * Override serialziation mapper implementation. Messages are stringified
   * with a mapper when received/sent to/from a SQS Queue.
   *
   * @defaultValue Json
   */
  mapper?: MapperFactory<string>;

  /**
   * Override SQS Queue Props in the Build context - use this to change
   * configuration of the behavior with the AWS CDK.
   */
  queueProps?: Build<sqs.QueueProps>;

  /**
   * Shape of data in the topic.
   *
   * @defaultValue AnyShape
   */
  shape?: T;
}
/**
 * Represents a SQS Queue containtining messages of type, `T`, serialized with some `Codec`.
 */
export class Queue<T extends Shape = AnyShape> implements Resource<sqs.Queue> {
  public readonly mapper: Mapper<Value.Of<T>, string>;
  public readonly mapperFactory: MapperFactory<string>;
  public readonly resource: Build<sqs.Queue>;
  public readonly shape: T;

  constructor(
    scope: Build<cdk.Construct>,
    id: string,
    props: QueueProps<T> = {},
  ) {
    this.resource = CDK.chain(({sqs}) =>
      scope.chain((scope) =>
        (props.queueProps || Build.of({})).map(
          (props) => new sqs.Queue(scope, id, props),
        ),
      ),
    );

    this.shape = (props.shape || any) as T;
    this.mapperFactory = props.mapper || Json.stringifyMapper;
    this.mapper = this.mapperFactory(this.shape);
  }

  /**
   * Get a Lazy `Stream` of notifications Queue's messages.
   *
   * Warning: do not consume from the Queue twice - it does not have fan-out.
   */
  public messages(): Messages<Value.Of<T>, []> {
    const mapper = this.mapper;
    class Root extends Messages<Value.Of<T>, []> {
      /**
       * Bottom of the recursive async generator - returns the records
       * parsed and validated out of the SQSEvent.
       *
       * @param event - payload of SQS event
       */
      // eslint-disable-next-line @typescript-eslint/require-await,@typescript-eslint/explicit-function-return-type
      public async *run(event: Event.Payload) {
        for (const record of event.Records.map((record) =>
          mapper.read(record.body),
        )) {
          yield record;
        }
      }
    }
    return new Root(this, undefined as any, {
      depends: [],
      handle: <T>(i: T): T => i,
    });
  }

  /**
   * A client with permission to consume and send messages.
   */
  public consumeAndSendAccess(): Dependency<
    Queue.ConsumeAndSendClient<Value.Of<T>>
  > {
    return this.dependency((queue, g) => {
      queue.grantConsumeMessages(g);
      queue.grantSendMessages(g);
    });
  }

  /**
   * A client with only permission to consume messages from this Queue.
   */
  public consumeAccess(): Dependency<Queue.ConsumeClient<Value.Of<T>>> {
    return this.dependency((queue, g) => queue.grantConsumeMessages(g));
  }

  /**
   * A client with only permission to send messages to this Queue.
   */
  public sendAccess(): Dependency<Queue.SendClient<Value.Of<T>>> {
    return this.dependency((queue, g) => queue.grantSendMessages(g));
  }

  private dependency<C>(
    grant: (queue: sqs.Queue, grantable: iam.IGrantable) => void,
  ): Dependency<C> {
    return {
      bootstrap: Run.of(
        async (ns, cache) =>
          (new Queue.Client(
            ns.get("queueUrl"),
            cache.getOrCreate("aws:sqs", () => new AWS.SQS()),
            this.mapper,
          ) as any) as C,
      ),
      install: this.resource.map((queue) => (ns, grantable): void => {
        grant(queue, grantable);
        ns.set("queueUrl", queue.queueUrl);
      }),
    };
  }
}

/**
 * Namespace for `Queue` type aliases and its `Client` implementation.
 */
export namespace Queue {
  export type ConsumeAndSendClient = Client<T>;
  export type ConsumeClient = Omit<
    Client<T>,
    "sendMessage" | "sendMessageBatch"
  >;
  export type SendClient = Omit<Client<T>, "receiveMessage">;

  export type ReceiveMessageRequest = Omit<
    AWS.SQS.ReceiveMessageRequest,
    "QueueUrl"
  >;
  export type ReceiveMessageResult<T> = ({Body: T} & Omit<
    AWS.SQS.Message,
    "Body"
  >)[];
  export type SendMessageRequest = Omit<
    AWS.SQS.SendMessageRequest,
    "QueueUrl" | "MessageBody"
  >;
  export type SendMessageResult = AWS.SQS.SendMessageResult;

  export type SendMessageBatchRequestEntry = _SendMessageBatchRequestEntry<T>;
  type _SendMessageBatchRequestEntry<T> = {MessageBody: T} & Omit<
    AWS.SQS.SendMessageBatchRequestEntry,
    "MessageBody"
  >;

  export type SendMessageBatchRequest = Array<SendMessageBatchRequestEntry<T>>;
  export type SendMessageBatchResult = AWS.SQS.SendMessageBatchResult;

  /**
   * Runtime representation of a SQS Queue.
   */
  export class Client<T> implements Sink<T> {
    constructor(
      public readonly queueUrl: string,
      public readonly client: AWS.SQS,
      public readonly mapper: Mapper<T, string>,
    ) {}

    /**
     * Retrieves one or more messages (up to 10), from the specified queue.
     */
    public async receiveMessage(
      request?: ReceiveMessageRequest,
    ): Promise<ReceiveMessageResult<T>> {
      const response = await this.client
        .receiveMessage({
          ...(request || {}),
          QueueUrl: this.queueUrl,
        })
        .promise();
      return (response.Messages || []).map((message) => ({
        ...message,
        Body: this.mapper.read(message.Body!),
      }));
    }

    /**
     * Delivers a message to the specified queue.
     */
    public sendMessage(
      message: T,
      request: SendMessageRequest = {},
    ): Promise<SendMessageResult> {
      return this.client
        .sendMessage({
          MessageBody: this.mapper.write(message),
          QueueUrl: this.queueUrl,
          ...request,
        })
        .promise();
    }

    /**
     * Delivers a batch of messages to the specified queue.
     */
    public sendMessageBatch(
      request: SendMessageBatchRequest<T>,
    ): Promise<SendMessageBatchResult> {
      return this.client
        .sendMessageBatch({
          Entries: request.map((record) => ({
            ...record,
            MessageBody: this.mapper.write(record.MessageBody),
          })),
          QueueUrl: this.queueUrl,
        })
        .promise();
    }

    public async sink(records: T[], props?: SinkProps): Promise<void> {
      return sink(
        records,
        async (values) => {
          const batch = values.map((value, i) => ({
            Id: i.toString(10),
            MessageBody: value,
          }));
          const result = await this.sendMessageBatch(batch);

          if (result.Failed) {
            return result.Failed.map((r) => values[parseInt(r.Id, 10)]);
          }
          return [];
        },
        props,
        10,
      );
    }
  }
}
