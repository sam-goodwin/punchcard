import AWS = require('aws-sdk');

import crypto = require('crypto');
import path = require('path');

import glue = require('@aws-cdk/aws-glue');
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import cdk = require('@aws-cdk/core');

import { ClassShape, ClassType, Shape, ShapeGuards } from '@punchcard/shape';
import { DataType, PartitionKeys, Schema, schema } from '@punchcard/shape-glue';
import { Mapper, Value } from '@punchcard/shape-runtime';
import { Validator } from '../../../@punchcard/shape-validation/lib/validator';
import { Build } from '../core/build';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import * as S3 from '../s3';
import { Compression } from '../util/compression';
import { Sink } from '../util/sink';

/**
 * Augmentation of `glue.TableProps`, using a `Shape` to define the
 * schema and partitionKeys.
 */
export type TableProps<T extends ClassType> = {
  /**
   * Type of data stored in the Table.
   */
  type: T;

  /**
   * Data codec of the table.
   *
   * @default JsonCodec
   */
  codec?: DataType;

  /**
   * Type of compression.
   *
   * @default None
   */
  compression?: Compression;

  /**
   * Database to store this Table.
   */
  database: Build<glue.Database>;

  /**
   * Optionally set the S3 Bucket containing this Table's objects.
   *
   * @default - one is created for you.
   */
  bucket?: Build<s3.Bucket>;

  /**
   * Name of the Table.
   */
  tableName: string;

  /**
   * Optional description of the Tazble.
   */
  description?: string;

  /**
   * Optional s3 prefix to append to all objects written to this Table in S3.
   *
   * @default - no prefix
   */
  s3Prefix?: string;
};

/**
 * Represents a partitioned Glue Table.
 */
export class Table<T extends ClassType> implements Resource<glue.Table> {
  /**
   * Type of compression.
   */
  public readonly compression: Compression;

  /**
   * Rich model of the columns and partitions of the table.
   */
  public readonly shape: Shape.Of<T>;

  /**
   * Schema of the table.
   */
  public readonly type: T;

  /**
   * Columns of this Table.
   */
  public readonly schema: Schema<T>;

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

  constructor(scope: Build<cdk.Construct>, id: string, props: TableProps<T>) {
    const compression = (props.compression || Compression.None);
    const codec = (props.codec || DataType.Json);

    this.dataType = codec;
    this.type = props.type;
    this.schema = schema(this.type);
    this.compression = compression;

    this.s3Prefix = props.s3Prefix || props.tableName + '/';
    this.resource = scope.chain(scope => props.database.chain(database => {
      const makeTable = (bucket?: s3.Bucket) => {
        const table = new glue.Table(scope, id, {
          ...props,
          database,
          bucket,
          dataFormat: codec.format,
          compressed: compression.isCompressed,
          s3Prefix: this.s3Prefix,

          columns: Object.values(this.schema.columns),
          partitionKeys: Object.entries(this.schema.partitionKeys).map(([name, schema]) => ({
            name,
            type: (() => {
              if (ShapeGuards.isBoolShape(schema)) {
                return glue.Schema.BOOLEAN;
              } else if (ShapeGuards.isStringShape(schema)) {
                return glue.Schema.STRING;
              } else if (ShapeGuards.isNumberShape(schema)) {
                return glue.Schema.DOUBLE; // TODO: really need an integer type
              } else if (ShapeGuards.isTimestampShape(schema)) {
                return glue.Schema.TIMESTAMP;
              } else {
                throw new Error(`invalid type for partition key ${schema}, must be string, numeric, boolean or timestamp`);
              }
            })()
          })),
        });

        (table as any).grant = (grantee: iam.IGrantable, actions: string[]) => {
          // Hack: override grant to also add catalog and database arns as resources
          return iam.Grant.addToPrincipal({
            grantee,
            resourceArns: [table.tableArn, table.database.databaseArn, table.database.catalogArn],
            actions,
          });
        };

        return table;
      };

      if (props.bucket) {
        return props.bucket.map(bucket => makeTable(bucket));
      } else {
        return Build.of(makeTable());
      }
    }));

    this.bucket = new S3.Bucket(this.resource.map(table => table.bucket as any));
  }

  /**
   * Runtime dependency with read/write access to the Table and S3 Bucket.
   */
  public readWriteAccess(): Dependency<Table.ReadWrite<T>> {
    return this.client((t, g) => t.grantReadWrite(g), this.bucket.readWriteAccess());
  }

  /**
   * Runtime dependency with read access to the Table and S3 Bucket.
   */
  public readAccess(): Dependency<Table.ReadOnly<T>> {
    return this.client((t, g) => t.grantRead(g), this.bucket.readAccess());
  }

  /**
   * Runtime dependency with write access to the Table and S3 Bucket.
   */
  public writeAccess(): Dependency<Table.WriteOnly<T>> {
    return this.client((t, g) => t.grantWrite(g), this.bucket.writeAccess());
  }

  private client<C>(grant: (table: glue.Table, grantable: iam.IGrantable) => void, bucket: Dependency<any>): Dependency<C> {
    return {
      install: this.resource.map(table => (ns, grantable) => {
        grant(table, grantable);
        ns.set('catalogId', table.database.catalogId);
        ns.set('databaseName', table.database.databaseName);
        ns.set('tableName', table.tableName);

        Build.resolve(bucket.install)(ns.namespace('bucket'), grantable);
      }),
      bootstrap: Run.of(async (ns, cache) => new Table.Client(
        cache.getOrCreate('aws:glue', () => new AWS.Glue()),
        ns.get('catalogId'),
        ns.get('databaseName'),
        ns.get('tableName'),
        await Run.resolve(bucket.bootstrap)(ns.namespace('bucket'), cache),
        this
      ) as any)
    };
  }
}

function partitionKeyMapper<T extends Shape>(type: T): Mapper<T, string> {
  if (ShapeGuards.isBoolShape(type)) {
    return {
      read: (str: string) => {
        const lower = str.toLowerCase();
        if (lower === 'true') {
          return true;
        } else if (lower === 'false') {
          return false;
        } else {
          throw new Error(`invalid boolean format: ${str}`);
        }
      },
      write: (bool: boolean) => bool.toString()
    } as any;
  } else if (ShapeGuards.isStringShape(type)) {
    return {
      read: (s: string) => s,
      write: (s: string) => s
    } as any;
  } else if (ShapeGuards.isNumberShape(type)) {
    return {
      read: (s: string) => parseFloat(s), // TODO: really need an integer type
      write: (n: number) => n.toString(10)
    } as any;
  } else {
    throw new Error(`invalid type for partition key ${type}, must be string, numeric, boolean`);
  }
}

export namespace Table {
  /**
   * Client type aliaes.
   */
  export interface ReadWrite<C extends ClassType> extends Table.Client<C> {}
  export interface ReadOnly<C extends ClassType> extends Omit<Table.Client<C>, 'batchCreatePartition' | 'createPartition' | 'updatePartition' | 'sink'> {}
  export interface WriteOnly<C extends ClassType> extends Omit<Table.Client<C>, 'getPartitions'> {}

  export type PartitionValue<T extends ClassType> = {
    [PK in PartitionKeys<T>]: Value.Of<InstanceType<T>[PK]>
  };

  /**
   * Request and Response aliases.
   */
  export interface GetPartitionsRequest extends Omit<AWS.Glue.GetPartitionsRequest, 'CatalogId' | 'DatabaseName' | 'TableName'> {}
  export type GetPartitionsResponse<T extends ClassType> = {
    Partitions: Array<{
      Values: PartitionValue<T>;
    } & Omit<AWS.Glue.Partition, 'Values'>>
  };

  export type CreatePartitionRequest<T extends ClassType> = {
    Partition: PartitionValue<T>,
    Location: string,
    LastAccessTime?: Date
  } &  Omit<AWS.Glue.PartitionInput, 'Values' | 'StorageDescriptor'>;

  export interface CreatePartitionResponse extends AWS.Glue.CreatePartitionResponse {}
  export interface BatchCreatePartitionRequestEntry<T extends ClassType> extends CreatePartitionRequest<T> {}
  export interface BatchCreatePartitionRequest<T extends ClassType> extends Array<BatchCreatePartitionRequestEntry<T>> {}
  export interface UpdatePartitionRequest<T extends ClassType> {
    Partition: PartitionValue<T>,
    UpdatedPartition: CreatePartitionRequest<T>
  }

  /**
   * Client for interacting with a Glue Table:
   * * create, update, delete and query partitions.
   * * write objects to the table (properly partitioned S3 Objects and Glue Partitions).
   */
  export class Client<T extends ClassType> implements Sink<Value.Of<T>> {
    /**
     * Validates a Record.
     */
    public readonly validator: Validator<Value.Of<T>>;

    /**
     * Mapper for writing a Record as a Buffer.
     */
    public readonly mapper: Mapper<ClassShape<T>, Buffer>;

    /**
     * Mappers for reading and writing partition keys to/from strings.
     */
    public readonly partitionMappers: {
      [K in PartitionKeys<T>]: Mapper<InstanceType<T>[K], string>
    };

    private readonly partitions: string[];

    constructor(
      public readonly client: AWS.Glue,
      public readonly catalogId: string,
      public readonly databaseName: string,
      public readonly tableName: string,
      public readonly bucket: S3.Client,
      public readonly table: Table<T>
    ) {
      this.partitions = Object.keys(table.schema.partitionKeys);
      this.validator = Validator.of(table.type);
      this.mapper = table.dataType.mapper(table.shape);
      this.partitionMappers = {} as any;
      Object.entries(table.shape.Members).forEach(([name, schema]) => {
        this.partitionMappers[name as PartitionKeys<T>] = partitionKeyMapper(schema.Type);
      });
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
     * @param records to write to the glue table
     */
    public async sink(records: Iterable<Value.Of<T>>) {
      const partitions: Map<string, {
        partition: PartitionValue<T>;
        records: Array<Value.Of<T>>;
      }> = new Map();

      for (const record of records) {
        const errors = this.validator(record, '$');
        if (errors) {
          throw new Error(`invalid record: ${errors.map(e => e.message).join('\n')}`);
        }
        const partition: any = this.partitions
          .map(p => ({ [p]: record[p].toString() }))
          .reduce((a, b) => ({...a, ...b}), {});

        const key = this.partitions.map(p => record[p].toString()).join('');
        if (!partitions.has(key)) {
          partitions.set(key, {
            partition,
            records: []
          });
        }
        partitions.get(key)!.records.push(record);
      }
      await Promise.all(Array.from(partitions.values()).map(async ({partition, records}) => {
        // determine the partition location in S3
        const partitionPath = Object.entries(partition).map(([name, value]) => {
          return `${name}=${(this.partitionMappers as any)[name].write(value)}`;
        }).join('/');
        let location = this.table.s3Prefix ? path.join(this.table.s3Prefix, partitionPath) : partitionPath;
        if (!location.endsWith('/')) {
          location += '/';
        }

        // serialize the content and compute a sha256 hash of the content
        // TODO: client-side encryption
        const content = await this.table.compression.compress(
          this.table.dataType.join(records.map(record => this.mapper.write(record))));
        const sha256 = crypto.createHash('sha256');
        sha256.update(content);
        const extension = this.table.compression.isCompressed ? `${this.table.dataType.extension}.${this.table.compression.extension!}` : this.table.dataType.extension;

        await this.bucket.putObject({
          // write objects based on sha256 to avoid duplicates during retries
          Key: `${location}${sha256.digest().toString('hex')}.${extension}`,
          Body: content
        });
        try {
          await this.createPartition({
            Partition: partition,
            Location: `s3://${this.bucket.bucketName}/${location}`
          });
        } catch (err) {
          console.error(err);
          const ex: AWS.AWSError = err;
          if (ex.code !== 'AlreadyExistsException') {
            throw err;
          }
        }
      }));
    }

    public async getPartitions(request: GetPartitionsRequest): Promise<GetPartitionsResponse<T>> {
      const response = await this.client.getPartitions({
        ...request,
        CatalogId: this.catalogId,
        DatabaseName: this.databaseName,
        TableName: this.tableName,
      }).promise();

      return {
        Partitions: (response.Partitions || []).map(partition => {
          const values: any = {};
          partition.Values!.forEach((value, i) => {
            const name = this.partitions[i];
            values[name] = (this.partitionMappers as any)[name].read(value);
          });
          return {
            ...partition,
            Values: values
          };
        })
      };
    }

    public createPartition(request: CreatePartitionRequest<T>): Promise<AWS.Glue.CreatePartitionResponse> {
      return this.client.createPartition({
        PartitionInput: this.createPartitionInput(request),
        CatalogId: this.catalogId,
        DatabaseName: this.databaseName,
        TableName: this.tableName,
      }).promise();
    }

    public batchCreatePartition(partitions: BatchCreatePartitionRequest<T>): Promise<AWS.Glue.BatchCreatePartitionResponse> {
      return this.client.batchCreatePartition({
        CatalogId: this.catalogId,
        DatabaseName: this.databaseName,
        TableName: this.tableName,
        PartitionInputList: partitions.map(partition => this.createPartitionInput(partition))
      }).promise();
    }

    public updatePartition(request: UpdatePartitionRequest<T>): Promise<AWS.Glue.UpdatePartitionResponse> {
      return this.client.updatePartition({
        CatalogId: this.catalogId,
        DatabaseName: this.databaseName,
        TableName: this.tableName,
        PartitionValueList: Object.values(request.Partition).map(value => (value as any).toString()),
        PartitionInput: this.createPartitionInput(request.UpdatedPartition)
      }).promise();
    }

    private createPartitionInput(request: CreatePartitionRequest<T>): AWS.Glue.PartitionInput {
      const partitionValues = Object.values(request.Partition).map(value => (value as any).toString());
      return {
        Values: partitionValues,
        LastAccessTime: request.LastAccessTime || new Date(),
        StorageDescriptor: {
          Compressed: this.table.compression.isCompressed,
          Location: request.Location,
          Columns: Object.values(this.table.schema.columns),
          InputFormat: this.table.dataType.format.inputFormat.className,
          OutputFormat: this.table.dataType.format.outputFormat.className,
          SerdeInfo: {
            SerializationLibrary: this.table.dataType.format.serializationLibrary.className
          }
        }
      };
    }
  }
}