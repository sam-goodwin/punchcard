import * as S3 from "../s3";
import * as cdk from "@aws-cdk/core";
import * as glue from "@aws-cdk/aws-glue";
import * as iam from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import {Columns, DataType, PartitionKeys, schema} from "@punchcard/shape-hive";
import {
  Mapper,
  Record,
  RecordShape,
  Shape,
  ShapeGuards,
  Value,
  integer,
} from "@punchcard/shape";
import AWS from "aws-sdk";
import {Build} from "../core/build";
import {CDK} from "../core/cdk";
import {Compression} from "../util/compression";
import {Dependency} from "../core/dependency";
import {Resource} from "../core/resource";
import {Run} from "../core/run";
import {Sink} from "../util/sink";
import crypto from "crypto";
import path from "path";

/**
 * Augmentation of `glue.TableProps`, using a `Shape` to define the
 * schema and partitionKeys.
 */
export type TableProps<T extends RecordShape, P extends RecordShape> = {
  /**
   * Optionally set the S3 Bucket containing this Table's objects.
   *
   * @defaultValue one is created for you.
   */
  bucket?: Build<s3.Bucket>;

  /**
   * Data codec of the table.
   *
   * @defaultValue JsonCodec
   */
  codec?: DataType;

  /**
   * Type of data stored in the Table.
   */
  columns: T;

  /**
   * Type of compression.
   *
   * @defaultValue None
   */
  compression?: Compression;

  /**
   * Database to store this Table.
   */
  database: Build<glue.Database>;

  /**
   * Optional description of the Tazble.
   */
  description?: string;

  /**
   * Partition configuration.
   */
  partition: {
    /**
     * Return partition key values from the columns.
     */
    get: (value: Value.Of<T>) => Value.Of<P>;
    /**
     * Record representing the partition keys.
     */
    keys: P;
  };

  /**
   * Optional s3 prefix to append to all objects written to this Table in S3.
   *
   * @defaultValue - no prefix
   */
  s3Prefix?: string;

  /**
   * Name of the Table.
   */
  tableName: string;
};

/**
 * Represents a partitioned Glue Table.
 */
export class Table<T extends RecordShape, P extends RecordShape>
  implements Resource<glue.Table> {
  /**
   * Type of compression.
   */
  public readonly compression: Compression;

  public readonly columns: {
    readonly schema: Columns<T>;
    readonly shape: T;
    readonly type: T;
  };

  public readonly partition: {
    get: (value: Value.Of<T>) => Value.Of<P>;
    keys: Columns<P>;
    shape: P;
    type: P;
  };

  /**
   * Data Type for reading and writing records (in a queue/stream/topic/etc.) and blobs (s3 objects).
   */
  public readonly dataType: DataType;

  /**
   * The underlying `glue.Table` construct.
   */
  public readonly resource: Build<glue.Table>;

  /**
   * S3 Bucket containing this Table's objects.
   */
  public readonly bucket: S3.Bucket;

  /**
   * Prefix of this Table's S3 Objects.
   */
  public readonly s3Prefix?: string;

  constructor(
    scope: Build<cdk.Construct>,
    id: string,
    props: TableProps<T, P>,
  ) {
    const compression = props.compression || Compression.None;
    const codec = props.codec || DataType.Json;

    this.dataType = codec;
    this.columns = {
      schema: schema(props.columns),
      shape: props.columns,
      type: props.columns,
    };
    this.partition = {
      get: props.partition.get,
      keys: schema(props.partition.keys),
      shape: props.partition.keys,
      type: props.partition.keys,
    };
    this.compression = compression;

    this.s3Prefix = props.s3Prefix || props.tableName + "/";
    this.resource = CDK.chain(({glue, iam}) =>
      scope.chain((scope) =>
        props.database.chain((database) => {
          const makeTable = (bucket?: s3.Bucket): glue.Table => {
            const table = new glue.Table(scope, id, {
              ...props,
              bucket,
              columns: Object.values(this.columns.schema),
              compressed: compression.isCompressed,
              dataFormat: codec.format,
              database,

              partitionKeys: Object.values(this.partition.keys),
              s3Prefix: this.s3Prefix,
            });

            // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
            (table as any).grant = (
              grantee: iam.IGrantable,
              actions: string[],
            ) => {
              // Hack: override grant to also add catalog and database arns as resources
              return iam.Grant.addToPrincipal({
                actions,
                grantee,
                resourceArns: [
                  table.tableArn,
                  table.database.databaseArn,
                  table.database.catalogArn,
                ],
              });
            };

            return table;
          };

          if (props.bucket) {
            return props.bucket.map((bucket) => makeTable(bucket));
          } else {
            return Build.of(makeTable());
          }
        }),
      ),
    );

    this.bucket = new S3.Bucket(
      this.resource.map((table) => table.bucket as any),
    );
  }

  /**
   * Runtime dependency with read/write access to the Table and S3 Bucket.
   */
  public readWriteAccess(): Dependency<Table.ReadWrite<T, P>> {
    return this.client(
      (t, g) => t.grantReadWrite(g),
      this.bucket.readWriteAccess(),
    );
  }

  /**
   * Runtime dependency with read access to the Table and S3 Bucket.
   */
  public readAccess(): Dependency<Table.ReadOnly<T, P>> {
    return this.client((t, g) => t.grantRead(g), this.bucket.readAccess());
  }

  /**
   * Runtime dependency with write access to the Table and S3 Bucket.
   */
  public writeAccess(): Dependency<Table.WriteOnly<T, P>> {
    return this.client((t, g) => t.grantWrite(g), this.bucket.writeAccess());
  }

  private client<C>(
    grant: (table: glue.Table, grantable: iam.IGrantable) => void,
    bucket: Dependency<any>,
  ): Dependency<C> {
    return {
      bootstrap: Run.of(
        async (ns, cache) =>
          new Table.Client(
            cache.getOrCreate("aws:glue", () => new AWS.Glue()),
            ns.get("catalogId"),
            ns.get("databaseName"),
            ns.get("tableName"),
            await Run.resolve(bucket.bootstrap)(ns.namespace("bucket"), cache),
            this,
          ) as any,
      ),
      install: this.resource.map((table) => (ns, grantable): Promise<void> => {
        grant(table, grantable);
        ns.set("catalogId", table.database.catalogId);
        ns.set("databaseName", table.database.databaseName);
        ns.set("tableName", table.tableName);
        Build.resolve(bucket.install)(ns.namespace("bucket"), grantable);
      }),
    };
  }
}

function partitionKeyMapper<T extends Shape>(type: T): Mapper<T, string> {
  if (ShapeGuards.isBoolShape(type)) {
    return {
      read: (str: string) => {
        const lower = str.toLowerCase();
        if (lower === "true") {
          return true;
        } else if (lower === "false") {
          return false;
        } else {
          throw new Error(`invalid boolean format: ${str}`);
        }
      },
      write: (bool: boolean) => bool.toString(),
    } as any;
  } else if (ShapeGuards.isStringShape(type)) {
    return {
      read: (s: string) => s,
      write: (s: string) => s,
    } as any;
  } else if (ShapeGuards.isNumberShape(type)) {
    return {
      read: (s: string) => parseFloat(s), // TODO: really need an integer type
      write: (n: number) => n.toString(10),
    } as any;
  } else if (ShapeGuards.isIntegerShape(type)) {
    return {
      read: (s: string) => parseInt(s, 10),
      write: (n: number) => n.toString(10),
    } as any;
  } else {
    throw new Error(
      `invalid type for partition key ${type}, must be string, numeric, boolean`,
    );
  }
}

export namespace Table {
  /**
   * Client type aliaes.
   */
  export type ReadWrite = Table.Client<T, P>;
  export type ReadOnly = Omit<
    Table.Client<T, P>,
    "batchCreatePartition" | "createPartition" | "updatePartition" | "sink"
  >;
  export type WriteOnly = Omit<Table.Client<T, P>, "getPartitions">;

  /**
   * Request and Response aliases.
   */
  export type GetPartitionsRequest = Omit<
    AWS.Glue.GetPartitionsRequest,
    "CatalogId" | "DatabaseName" | "TableName"
  >;
  export type GetPartitionsResponse<P extends RecordShape> = {
    Partitions: ({
      Values: Value.Of<P>;
    } & Omit<AWS.Glue.Partition, "Values">)[];
  };

  export type CreatePartitionRequest<P extends RecordShape> = {
    LastAccessTime?: Date;
    Location: string;
    Partition: Value.Of<P>;
  } & Omit<AWS.Glue.PartitionInput, "Values" | "StorageDescriptor">;

  export type CreatePartitionResponse = AWS.Glue.CreatePartitionResponse;
  export type BatchCreatePartitionRequestEntry = CreatePartitionRequest<T>;
  export type BatchCreatePartitionRequest = Array<
    BatchCreatePartitionRequestEntry<T>
  >;
  export interface UpdatePartitionRequest<P extends RecordShape> {
    Partition: Value.Of<P>;
    UpdatedPartition: CreatePartitionRequest<P>;
  }

  /**
   * Client for interacting with a Glue Table:
   * * create, update, delete and query partitions.
   * * write objects to the table (properly partitioned S3 Objects and Glue Partitions).
   */
  export class Client<T extends RecordShape, P extends RecordShape>
    implements Sink<Value.Of<T>> {
    /**
     * Mapper for writing a Record as a Buffer.
     */
    public readonly mapper: Mapper<Value.Of<T>, Buffer>;

    /**
     * Mappers for reading and writing partition keys to/from strings.
     */
    public readonly partitionMappers: {
      [K in PartitionKeys<T>]: Mapper<Value.Of<T>[K], string>;
    };

    private readonly partitions: string[];

    constructor(
      public readonly client: AWS.Glue,
      public readonly catalogId: string,
      public readonly databaseName: string,
      public readonly tableName: string,
      public readonly bucket: S3.Client,
      public readonly table: Table<T, P>,
    ) {
      this.partitions = Object.keys(table.partition.keys);
      this.mapper = table.dataType.mapper(table.columns.shape);
      this.partitionMappers = {} as any;
      Object.entries(table.partition.shape.Members).forEach(
        ([name, schema]) => {
          this.partitionMappers[name as PartitionKeys<T>] = partitionKeyMapper(
            schema as Shape,
          );
        },
      );
    }

    /**
     * Semantically partitions a batch of records and writes them to S3 and the Table.
     *
     * The S3 Object path is determined by the partition values, and the Object Key is determined
     * by as sha256 of the content.
     *
     * Warning: This method should not be used for rapid calls with small payloads, as it my
     * result in many S3 objects being written to the table which could slow down consumers.
     *
     * @param records – to write to the glue table
     */
    public async sink(records: Iterable<Value.Of<T>>) {
      const partitions: Map<
        string,
        {
          partition: Value.Of<P>;
          records: Value.Of<T>[];
        }
      > = new Map();

      for (const record of records) {
        const partition = this.table.partition.get(record);
        const key = this.partitions
          .map((p) => partition[p].toString())
          .join("");
        if (!partitions.has(key)) {
          partitions.set(key, {
            partition,
            records: [],
          });
        }
        partitions.get(key)!.records.push(record);
      }
      await Promise.all(
        [...partitions.values()].map(async ({partition, records}) => {
          // determine the partition location in S3
          const partitionPath = Object.entries(partition)
            .map(([name, value]) => {
              return `${name}=${(this.partitionMappers as any)[name].write(
                value,
              )}`;
            })
            .join("/");
          let location = this.table.s3Prefix
            ? path.join(this.table.s3Prefix, partitionPath)
            : partitionPath;
          if (!location.endsWith("/")) {
            location += "/";
          }

          // serialize the content and compute a sha256 hash of the content
          // TODO: client-side encryption
          const content = await this.table.compression.compress(
            this.table.dataType.join(
              records.map((record) => this.mapper.write(record)),
            ),
          );
          const sha256 = crypto.createHash("sha256");
          sha256.update(content);
          const extension = this.table.compression.isCompressed
            ? `${this.table.dataType.extension}.${this.table.compression
                .extension!}`
            : this.table.dataType.extension;

          await this.bucket.putObject({
            // write objects based on sha256 to avoid duplicates during retries
            Body: content,
            Key: `${location}${sha256.digest().toString("hex")}.${extension}`,
          });
          try {
            await this.createPartition({
              Location: `s3://${this.bucket.bucketName}/${location}`,
              Partition: partition,
            });
          } catch (error) {
            console.error(error);
            const ex: AWS.AWSError = error;
            if (ex.code !== "AlreadyExistsException") {
              throw error;
            }
          }
        }),
      );
    }

    public async getPartitions(
      request: GetPartitionsRequest,
    ): Promise<GetPartitionsResponse<T>> {
      const response = await this.client
        .getPartitions({
          ...request,
          CatalogId: this.catalogId,
          DatabaseName: this.databaseName,
          TableName: this.tableName,
        })
        .promise();

      return {
        Partitions: (response.Partitions || []).map((partition) => {
          const values: any = {};
          partition.Values!.forEach((value, i) => {
            const name = this.partitions[i];
            values[name] = (this.partitionMappers as any)[name].read(value);
          });
          return {
            ...partition,
            Values: values,
          };
        }),
      };
    }

    public createPartition(
      request: CreatePartitionRequest<P>,
    ): Promise<AWS.Glue.CreatePartitionResponse> {
      return this.client
        .createPartition({
          CatalogId: this.catalogId,
          DatabaseName: this.databaseName,
          PartitionInput: this.createPartitionInput(request),
          TableName: this.tableName,
        })
        .promise();
    }

    public batchCreatePartition(
      partitions: BatchCreatePartitionRequest<P>,
    ): Promise<AWS.Glue.BatchCreatePartitionResponse> {
      return this.client
        .batchCreatePartition({
          CatalogId: this.catalogId,
          DatabaseName: this.databaseName,
          PartitionInputList: partitions.map((partition) =>
            this.createPartitionInput(partition),
          ),
          TableName: this.tableName,
        })
        .promise();
    }

    public updatePartition(
      request: UpdatePartitionRequest<P>,
    ): Promise<AWS.Glue.UpdatePartitionResponse> {
      return this.client
        .updatePartition({
          CatalogId: this.catalogId,
          DatabaseName: this.databaseName,
          PartitionInput: this.createPartitionInput(request.UpdatedPartition),
          PartitionValueList: Object.values(request.Partition).map((value) =>
            (value as any).toString(),
          ),
          TableName: this.tableName,
        })
        .promise();
    }

    private createPartitionInput(
      request: CreatePartitionRequest<P>,
    ): AWS.Glue.PartitionInput {
      const partitionValues = Object.values(request.Partition).map((value) =>
        (value as any).toString(),
      );
      return {
        LastAccessTime: request.LastAccessTime || new Date(),
        StorageDescriptor: {
          Columns: Object.values(this.table.columns.schema).map((c) => ({
            Comment: c.comment,
            Name: c.name,
            Type: c.type.inputString,
          })),
          Compressed: this.table.compression.isCompressed,
          InputFormat: this.table.dataType.format.inputFormat.className,
          Location: request.Location,
          OutputFormat: this.table.dataType.format.outputFormat.className,
          SerdeInfo: {
            SerializationLibrary: this.table.dataType.format
              .serializationLibrary.className,
          },
        },
        Values: partitionValues,
      };
    }
  }
}

export namespace Partition {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function partition(timestamp: Date) {
    return {
      day: timestamp.getUTCDate(),
      hour: timestamp.getUTCHours(),
      minute: timestamp.getUTCMinutes(),
      month: timestamp.getUTCMonth(),
      year: timestamp.getUTCFullYear(),
    };
  }

  export class Yearly extends Record({
    year: integer,
  }) {
    public static readonly of = (timestamp: Date): Yearly =>
      new Yearly(partition(timestamp));
  }
  export class Monthly extends Record({
    month: integer,
    year: integer,
  }) {
    public static readonly of = (timestamp: Date): Monthly =>
      new Monthly(partition(timestamp));
  }
  export class Daily extends Record({
    day: integer,
    month: integer,
    year: integer,
  }) {
    public static readonly of = (timestamp: Date): Daily =>
      new Daily(partition(timestamp));
  }
  export class Hourly extends Record({
    day: integer,
    hour: integer,
    month: integer,
    year: integer,
  }) {
    public static readonly of = (timestamp: Date): Hourly =>
      new Hourly(partition(timestamp));
  }
  export class Minutely extends Record({
    day: integer,
    hour: integer,
    minute: integer,
    month: integer,
    year: integer,
  }) {
    public static readonly of = (timestamp: Date): Minutely =>
      new Minutely(partition(timestamp));
  }
  export const byYear = Yearly.of;
  export const byMonth = Monthly.of;
  export const byHour = Hourly.of;
  export const byDay = Daily.of;
  export const byMinute = Minutely.of;

  export const ByMinute = {
    get: (record: {timestamp: Date}): Minutely => byMinute(record.timestamp),
    keys: Minutely,
  };
}
