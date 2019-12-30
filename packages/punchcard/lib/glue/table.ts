import AWS = require('aws-sdk');

import crypto = require('crypto');
import path = require('path');

import glue = require('@aws-cdk/aws-glue');
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import cdk = require('@aws-cdk/core');

import { Build } from '../core/build';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import * as S3 from '../s3';
import { Json, Kind, Mapper, RuntimeShape, Shape, struct, StructShape } from '../shape';
import { Codec } from '../util/codec';
import { Compression } from '../util/compression';
import { Omit } from '../util/omit';
import { Sink } from '../util/sink';

/**
 * A Glue Table's Columns.
 */
export type Columns = {
  [key: string]: Shape<any>;
};

/**
 * A Glue Table's Partition Keys.
 */
export type PartitionKeys = {
  [key: string]: Shape<string> | Shape<number>;
};

/**
 * Augmentation of `glue.TableProps`, using a `Shape` to define the
 * schema and partitionKeys.
 */
export type TableProps<C extends Columns, P extends PartitionKeys> = {
  /**
   * Data columns of the data stored in the table.
   */
  columns: C;

  /**
   * Validate each record before writing to this table.
   */
  validate?: (record: RuntimeShape<StructShape<C>>) => void;

  /**
   * Shape of the partition keys of the table.
   */
  partition: {
    /**
     * Partition keys of the table.
     */
    keys: P;
    /**
     * Get a record's partitition.
     */
    get: (record: RuntimeShape<StructShape<C>>) => RuntimeShape<StructShape<P>>;
  };

  /**
   * Data codec of the table.
   *
   * @default Json
   */
  codec?: Codec;

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
export class Table<C extends Columns, P extends PartitionKeys> implements Resource<glue.Table> {
  /**
   * Type of compression.
   */
  public readonly compression: Compression;
  /**
   * Rich model of the columns and partitions of the table.
   */
  public readonly shape: {
    /**
     * Shape of the table's columns.
     */
    columns: C;
    /**
     * Shape of the table's partition keys.
     */
    partitions: P;
  };
  /**
   * Mapper for serializing and deserializing a record.
   */
  public readonly mapper: Mapper<RuntimeShape<StructShape<C>>, Buffer>;
  /**
   * Mappers for reading and writing partition keys to/from strings.
   */
  public readonly partitionMappers: {
    [K in keyof P]: Mapper<RuntimeShape<P[K]>, string>
  };
  /**
   * Codec for reading and writing records (in a queue/stream/topic/etc.) and blobs (s3 objects).
   */
  public readonly codec: Codec;
  /**
   * Get the partition columns from a record.
   */
  public readonly partition: (record: RuntimeShape<StructShape<C>>) => RuntimeShape<StructShape<P>>;
  /**
   * Optional function to validate data prior to writing into this table.
   */
  public readonly validate?: (record: RuntimeShape<StructShape<C>>) => void;

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

  constructor(scope: Build<cdk.Construct>, id: string, props: TableProps<C, P>) {
    const compression = (props.compression || Compression.None);
    const codec = (props.codec || Codec.Json);

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
          columns: Object.entries(props.columns).map(([name, schema]) => ({
            name,
            type: schema.toGlueType()
          })),
          partitionKeys: Object.entries(props.partition.keys).map(([name, schema]) => {
            switch (schema.kind) {
              case Kind.String:
              case Kind.Boolean:
              case Kind.Timestamp:
              case Kind.Integer:
              case Kind.Number:
                break;
              default:
                throw new Error(`invalid type for partition key ${schema}, must be string, numeric, boolean or timestamp`);
            }
            return {
              name,
              type: schema.toGlueType()
            };
          }),
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

    this.shape = {
      columns: props.columns,
      partitions: props.partition.keys
    };
    this.partition = props.partition.get;
    this.validate = props.validate;

    this.compression = compression;
    this.codec = codec;
    this.mapper = this.codec.mapper(struct(this.shape.columns));
    this.partitionMappers = {} as any;
    Object.entries(this.shape.partitions).forEach(([name, shape]) => {
      this.partitionMappers[name as keyof P] = Json.forShape(shape) as any;
    });
  }

  /**
   * Runtime dependency with read/write access to the Table and S3 Bucket.
   */
  public readWriteAccess(): Dependency<Table.ReadWriteClient<C, P>> {
    return this.client((t, g) => t.grantReadWrite(g), this.bucket.readWriteAccess());
  }

  /**
   * Runtime dependency with read access to the Table and S3 Bucket.
   */
  public readAccess(): Dependency<Table.ReadClient<C, P>> {
    return this.client((t, g) => t.grantRead(g), this.bucket.readAccess());
  }

  /**
   * Runtime dependency with write access to the Table and S3 Bucket.
   */
  public writeAccess(): Dependency<Table.WriteClient<C, P>> {
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
        this,
        await Run.resolve(bucket.bootstrap)(ns.namespace('bucket'), cache)
      ) as any)
    };
  }
}

export namespace Table {
  /**
   * Client type aliaes.
   */
  export type ReadWriteClient<C extends Columns, P extends PartitionKeys> = Table.Client<C, P>;
  export type ReadClient<C extends Columns, P extends PartitionKeys> = Omit<Table.Client<C, P>, 'batchCreatePartition' | 'createPartition' | 'updatePartition' | 'sink'>;
  export type WriteClient<C extends Columns, P extends PartitionKeys> = Omit<Table.Client<C, P>, 'getPartitions'>;

  /**
   * Request and Response aliases.
   */
  export type GetPartitionsRequest = Omit<AWS.Glue.GetPartitionsRequest, 'CatalogId' | 'DatabaseName' | 'TableName'>;
  export type GetPartitionsResponse<P extends PartitionKeys> = {Partitions: Array<{
    Values: RuntimeShape<StructShape<P>>;
  } & Omit<AWS.Glue.Partition, 'Values'>>};
  export type CreatePartitionRequest<P extends PartitionKeys> = {Partition: RuntimeShape<StructShape<P>>, Location: string, LastAccessTime?: Date} &  Omit<AWS.Glue.PartitionInput, 'Values' | 'StorageDescriptor'>;
  export type CreatePartitionResponse = AWS.Glue.CreatePartitionResponse;
  export type BatchCreatePartitionRequestEntry<P extends PartitionKeys> = CreatePartitionRequest<P>;
  export type BatchCreatePartitionRequest<P extends PartitionKeys> = Array<BatchCreatePartitionRequestEntry<P>>;
  export type UpdatePartitionRequest<P extends PartitionKeys> = {Partition: RuntimeShape<StructShape<P>>, UpdatedPartition: CreatePartitionRequest<P>};

  /**
   * Client for interacting with a Glue Table:
   * * create, update, delete and query partitions.
   * * write objects to the table (properly partitioned S3 Objects and Glue Partitions).
   */
  export class Client<C extends Columns, P extends PartitionKeys> implements Sink<RuntimeShape<StructShape<C>>> {
    private readonly partitions: string[];

    constructor(
      public readonly client: AWS.Glue,
      public readonly catalogId: string,
      public readonly databaseName: string,
      public readonly tableName: string,
      public readonly table: Table<C, P>,
      public readonly bucket: S3.Client
    ) {
      this.partitions = Object.keys(table.shape.partitions);
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
    public async sink(records: Iterable<RuntimeShape<StructShape<C>>>) {
      const partitions: Map<string, {
        partition: RuntimeShape<StructShape<P>>;
        records: Array<RuntimeShape<StructShape<C>>>;
      }> = new Map();

      for (const record of records) {
        if (this.table.validate) {
          this.table.validate(record);
        }
        const partition = this.table.partition(record);
        const key = Object.values(partition).map(value => (value as any).toString()).join('');
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
          return `${name}=${this.table.partitionMappers[name].write(value as any)}`;
        }).join('/');
        let location = this.table.s3Prefix ? path.join(this.table.s3Prefix, partitionPath) : partitionPath;
        if (!location.endsWith('/')) {
          location += '/';
        }

        // serialize the content and compute a sha256 hash of the content
        // TODO: client-side encryption
        const content = await this.table.compression.compress(
          this.table.codec.join(records.map(record => this.table.mapper.write(record))));
        const sha256 = crypto.createHash('sha256');
        sha256.update(content);
        const extension = this.table.compression.isCompressed ? `${this.table.codec.extension}.${this.table.compression.extension!}` : this.table.codec.extension;

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

    public async getPartitions(request: GetPartitionsRequest): Promise<GetPartitionsResponse<P>> {
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
            values[name] = this.table.partitionMappers[name].read(value);
          });
          return {
            ...partition,
            Values: values
          };
        })
      };
    }

    public createPartition(request: CreatePartitionRequest<P>): Promise<AWS.Glue.CreatePartitionResponse> {
      return this.client.createPartition({
        PartitionInput: this.createPartitionInput(request),
        CatalogId: this.catalogId,
        DatabaseName: this.databaseName,
        TableName: this.tableName,
      }).promise();
    }

    public batchCreatePartition(partitions: BatchCreatePartitionRequest<P>): Promise<AWS.Glue.BatchCreatePartitionResponse> {
      return this.client.batchCreatePartition({
        CatalogId: this.catalogId,
        DatabaseName: this.databaseName,
        TableName: this.tableName,
        PartitionInputList: partitions.map(partition => this.createPartitionInput(partition))
      }).promise();
    }

    public updatePartition(request: UpdatePartitionRequest<P>): Promise<AWS.Glue.UpdatePartitionResponse> {
      return this.client.updatePartition({
        CatalogId: this.catalogId,
        DatabaseName: this.databaseName,
        TableName: this.tableName,
        PartitionValueList: Object.values(request.Partition).map(value => (value as any).toString()),
        PartitionInput: this.createPartitionInput(request.UpdatedPartition)
      }).promise();
    }

    private createPartitionInput(request: CreatePartitionRequest<P>): AWS.Glue.PartitionInput {
      const partitionValues = Object.values(request.Partition).map(value => (value as any).toString());
      return {
        Values: partitionValues,
        LastAccessTime: request.LastAccessTime || new Date(),
        StorageDescriptor: {
          Compressed: this.table.compression.isCompressed,
          Location: request.Location,
          Columns: Object.entries(this.table.shape.columns).map(([name, type]) => {
            return {
              Name: name,
              Type: type.toGlueType().inputString
            };
          }),
          InputFormat: this.table.codec.format.inputFormat.className,
          OutputFormat: this.table.codec.format.outputFormat.className,
          SerdeInfo: {
            SerializationLibrary: this.table.codec.format.serializationLibrary.className
          }
        }
      };
    }
  }
}