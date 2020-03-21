import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as kinesis from "@aws-cdk/aws-kinesis";
import {
  AnyShape,
  Mapper,
  MapperFactory,
  Shape,
  Value,
  any,
} from "@punchcard/shape";
import AWS from "aws-sdk";
import {Build} from "../core/build";
import {CDK} from "../core/cdk";
import {Client} from "./client";
import {Compression} from "../util/compression";
import {DataType} from "@punchcard/shape-hive";
import {DeliveryStream} from "../firehose/delivery-stream";
import {Dependency} from "../core/dependency";
import {Event} from "./event";
import {Json} from "@punchcard/shape-json";
import {Records} from "./records";
import {Resource} from "../core/resource";
import {Run} from "../core/run";
import {v4 as uuid} from "uuid";

export interface StreamProps<T extends Shape = AnyShape> {
  /**
   * Override serialziation mapper implementation. Messages are stringified
   * with a mapper when received/sent to/from the Kinesis Stream.
   *
   * @defaultValue Json
   */
  mapper?: MapperFactory<Buffer>;
  /**
   * How to partition a record in the Stream.
   *
   * @defaultValue - uuid
   */
  partitionBy?: (record: Value.Of<T>) => string;

  /**
   * Shape of data in the Stream.
   *
   * @defaultValue AnyShape
   */
  shape?: T;

  /**
   * Override the Kinesis StreamProps at Build time.
   *
   * @defaultValue - default CDK behavior
   */
  streamProps?: Build<kinesis.StreamProps>;
}

/**
 * A Kinesis stream.
 */
export class Stream<T extends Shape = AnyShape>
  implements Resource<kinesis.Stream> {
  public readonly mapper: Mapper<Value.Of<T>, Buffer>;
  public readonly mapperFactory: MapperFactory<Buffer>;
  public readonly partitionBy: (record: Value.Of<T>) => string;
  public readonly resource: Build<kinesis.Stream>;
  public readonly shape: T;

  constructor(scope: Build<cdk.Construct>, id: string, props: StreamProps<T>) {
    this.resource = CDK.chain(({kinesis}) =>
      scope.chain((scope) =>
        (props.streamProps || Build.of({})).map(
          (props) => new kinesis.Stream(scope, id, props),
        ),
      ),
    );

    this.shape = (props.shape || any) as T;
    this.partitionBy = props.partitionBy || ((_): string => uuid());
    this.mapperFactory = props.mapper || Json.bufferMapper;
    this.mapper = this.mapperFactory(this.shape);
  }

  /**
   * Create an stream for this stream to perform chainable computations (map, flatMap, filter, etc.)
   */
  public records(): Records<Value.Of<T>, []> {
    const mapper = this.mapper;
    class Root extends Records<Value.Of<T>, []> {
      /**
       * Return an iterator of records parsed from the raw data in the event.
       * @param event - kinesis event sent to lambda
       */
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type,@typescript-eslint/require-await
      public async *run(event: Event.Payload) {
        for (const record of event.Records.map((record) =>
          mapper.read(Buffer.from(record.kinesis.data, "base64")),
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
   * Forward data in this stream to S3 via a Firehose Delivery Stream.
   *
   * Stream -\> Firehose -\> S3 (minutely).
   */
  public toFirehoseDeliveryStream(
    scope: Build<cdk.Construct>,
    id: string,
    props: {
      compression: Compression;
      dataType?: DataType;
    } = {
      compression: Compression.Gzip,
    },
  ): DeliveryStream<T> {
    return new DeliveryStream(scope, id, {
      compression: props.compression,
      stream: this,
    });
  }

  /**
   * Read and Write access to this stream.
   */
  public readWriteAccess(): Dependency<Stream.ReadWrite<T>> {
    return this.dependency((stream, g) => stream.grantReadWrite(g));
  }

  /**
   * Read-only access to this stream.
   */
  public readAccess(): Dependency<Stream.ReadOnly<T>> {
    return this.dependency((stream, g) => stream.grantRead(g));
  }

  /**
   * Write-only access to this stream.
   */
  public writeAccess(): Dependency<Stream.WriteOnly<T>> {
    return this.dependency((stream, g) => stream.grantWrite(g));
  }

  private dependency(
    grant: (stream: kinesis.Stream, grantable: iam.IGrantable) => void,
  ): Dependency<Client<T>> {
    return {
      bootstrap: Run.of((ns, cache) =>
        Promise.resolve(
          new Client(
            this,
            ns.get("streamName"),
            cache.getOrCreate("aws:kinesis", () => new AWS.Kinesis()),
          ) as any,
        ),
      ),
      install: this.resource.map((stream) => (ns, grantable): void => {
        grant(stream, grantable);
        ns.set("streamName", stream.streamName);
      }),
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Stream {
  export type ReadOnly = Omit<Client<S>, "putRecord" | "putRecords" | "sink">;
  export type WriteOnly = Omit<Client<S>, "getRecords">;
  export type ReadWrite = Client<S>;
}
