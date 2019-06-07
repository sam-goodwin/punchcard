import AWS = require('aws-sdk');

import path = require('path');

import glue = require('@aws-cdk/aws-glue');
import iam = require('@aws-cdk/aws-iam');
import cdk = require('@aws-cdk/cdk');

import { Cache, PropertyBag } from '../../compute/property-bag';
import { Runtime } from '../../compute/runtime';
import { Json, Kind, Mapper, RuntimeShape, RuntimeType, Shape, struct, Type } from '../../shape';
import { Omit } from '../../utils';
import { Codec } from '../codec';
import { Bucket } from '../s3';
import { Compression } from './compression';

import crypto = require('crypto');
import { Dependency } from '../../compute';
import { Resource } from '../../enumerable/resource';
import { Sink } from '../../enumerable/sink';

/**
 * Glue partition shape must be of only string, date or numeric types.
 */
export type Partition = {
  [key: string]: Type<string> | Type<number> | Type<Date> | Type<boolean>;
};

/**
 * Augmentation of `glue.TableProps`, using a `Shape` to define the
 * schema and partitionKeys.
 */
export type TableProps<T extends Shape, P extends Partition> = {
  /**
   * Data columns of the data stored in the table.
   */
  columns: T;

  /**
   * Validate each record before writing to this table.
   */
  validate?: (record: RuntimeShape<T>) => void;

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
    get: (record: RuntimeShape<T>) => RuntimeShape<P>;
  }

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
} & Omit<glue.TableProps, 'columns' | 'partitionKeys' | 'dataFormat' | 'compressed'>;

/**
 * Represents a partitioned Glue Table.
 */
export class Table<T extends Shape, P extends Partition> implements Resource<glue.Table>, Dependency<Table.ReadWriteClient<T, P>> {
  /**
   * Type of compression.
   */
  public readonly compression: Compression;
  /**
   * Rich model of the columns and partitions of the table.
   */
  public readonly shape: {
    columns: T;
    partitions: P;
  };
  public readonly mapper: Mapper<RuntimeShape<T>, Buffer>;
  public readonly partitionMappers: {
    [K in keyof P]: Mapper<RuntimeType<P[K]>, string>
  };
  public readonly codec: Codec;
  public readonly partition: (record: RuntimeShape<T>) => RuntimeShape<P>;
  public readonly validate?: (record: RuntimeShape<T>) => void;
  public readonly resource: glue.Table;

  constructor(scope: cdk.Construct, id: string, props: TableProps<T, P>) {
    const compression = (props.compression || Compression.None);
    const codec = (props.codec || Codec.Json);
    this.resource = new glue.Table(scope, id, {
      ...props,
      dataFormat: codec.format,
      compressed: compression.isCompressed,
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
    Object.entries(this.shape.partitions).forEach(([name, type]) => this.partitionMappers[name] = Json.forType(type) as any);

    (this.resource as any).grant = (grantee: iam.IGrantable, actions: string[]) => {
      // Hack: override grant to also add catalog and database arns as resources
      return iam.Grant.addToPrincipal({
        grantee,
        resourceArns: [this.resource.tableArn, this.resource.database.databaseArn, this.resource.database.catalogArn],
        actions,
      });
    };
  }

  public install(target: Runtime): void {
    return this.readWriteClient().install(target);
  }

  public readWriteClient(): Dependency<Table.ReadWriteClient<T, P>> {
    return this.client(g => this.resource.grantReadWrite(g), new Bucket(this.resource.bucket).readWriteClient());
  }

  public readClient(): Dependency<Table.ReadClient<T, P>> {
    return this.client(g => this.resource.grantRead(g), new Bucket(this.resource.bucket).readClient());
  }

  public writeClient(): Dependency<Table.WriteClient<T, P>> {
    return this.client(g => this.resource.grantWrite(g), new Bucket(this.resource.bucket).writeClient());
  }

  private client<C>(grant: (grantable: iam.IGrantable) => void, bucket: Dependency<any>): Dependency<C> {
    return {
      install: (target) => {
        grant(target.grantable);
        bucket.install(target.namespace('bucket'));
        target.properties.set('catalogId', this.resource.database.catalogId);
        target.properties.set('databaseName', this.resource.database.databaseName);
        target.properties.set('tableName', this.resource.tableName);
      },
      bootstrap: this.bootstrap.bind(this) as any
    };
  }

  public bootstrap(properties: PropertyBag, cache: Cache): Table.Client<T, P> {
    return new Table.Client(
      cache.getOrCreate('aws:glue', () => new AWS.Glue()),
      properties.get('catalogId'),
      properties.get('databaseName'),
      properties.get('tableName'),
      this,
      new Bucket(this.resource.bucket).bootstrap(properties.namespace('bucket'), cache)
    );
  }
}

export namespace Table {
  /**
   * Client type aliaes.
   */
  export type ReadWriteClient<T extends Shape, P extends Partition> = Table.Client<T, P>;
  export type ReadClient<T extends Shape, P extends Partition> = Omit<Table.Client<T, P>, 'batchCreatePartition' | 'createPartition' | 'updatePartition' | 'sink'>;
  export type WriteClient<T extends Shape, P extends Partition> = Omit<Table.Client<T, P>, 'getPartitions'>;

  /**
   * Request and Response aliases.
   */
  export type GetPartitionsRequest = Omit<AWS.Glue.GetPartitionsRequest, 'CatalogId' | 'DatabaseName' | 'TableName'>;
  export type GetPartitionsResponse<P extends Partition> = {Partitions: Array<{
    Values: RuntimeShape<P>;
  } & Omit<AWS.Glue.Partition, 'Values'>>};
  export type CreatePartitionRequest<P extends Partition> = {Partition: RuntimeShape<P>, Location: string, LastAccessTime?: Date} &  Omit<AWS.Glue.PartitionInput, 'Values' | 'StorageDescriptor'>;
  export type CreatePartitionResponse = AWS.Glue.CreatePartitionResponse;
  export type BatchCreatePartitionRequestEntry<P extends Partition> = CreatePartitionRequest<P>;
  export type BatchCreatePartitionRequest<P extends Partition> = Array<BatchCreatePartitionRequestEntry<P>>;
  export type UpdatePartitionRequest<P extends Partition> = {Partition: RuntimeShape<P>, UpdatedPartition: CreatePartitionRequest<P>};

  /**
   * Client for interacting with a Glue Table:
   * * create, update, delete and query partitions.
   * * write objects to the table (properly partitioned S3 Objects and Glue Partitions).
   */
  export class Client<T extends Shape, P extends Partition> implements Sink<RuntimeShape<T>> {
    private readonly partitions: string[];

    constructor(
      public readonly client: AWS.Glue,
      public readonly catalogId: string,
      public readonly databaseName: string,
      public readonly tableName: string,
      public readonly table: Table<T, P>,
      public readonly bucket: Bucket.Client
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
    public async sink(records: Iterable<RuntimeShape<T>>) {
      const partitions: Map<string, {
        partition: RuntimeShape<P>;
        records: Array<RuntimeShape<T>>;
      }> = new Map();

      for (const record of records) {
        if (this.table.validate) {
          this.table.validate(record);
        }
        const partition = this.table.partition(record);
        const key = Object.values(partition).map(p => p.toString()).join('');
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
        let location = this.table.resource.s3Prefix ? path.join(this.table.resource.s3Prefix, partitionPath) : partitionPath;
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
        PartitionValueList: Object.values(request.Partition).map(p => p.toString()),
        PartitionInput: this.createPartitionInput(request.UpdatedPartition)
      }).promise();
    }

    private createPartitionInput(request: CreatePartitionRequest<P>): AWS.Glue.PartitionInput {
      const partitionValues = Object.values(request.Partition).map(value => value.toString());
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
          InputFormat: this.table.resource.dataFormat.inputFormat.className,
          OutputFormat: this.table.resource.dataFormat.outputFormat.className,
          SerdeInfo: {
            SerializationLibrary: this.table.resource.dataFormat.serializationLibrary.className
          }
        }
      };
    }
  }
}