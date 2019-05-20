import AWS = require('aws-sdk');

import glue = require('@aws-cdk/aws-glue');
import iam = require('@aws-cdk/aws-iam');
import cdk = require('@aws-cdk/cdk');

import { Cache, PropertyBag } from '../../property-bag';
import { Client, Runtime } from '../../runtime';
import { Json, Kind, Mapper, RuntimeShape, RuntimeType, Shape, Type } from '../../shape';
import { Omit } from '../../utils';
import { DataFormat } from './data-format';

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
   * Shape of the data stored in the table.
   */
  columns: T;
  /**
   * Shape of the partition keys of the table.
   */
  partitions: P;
  /**
   * Data format of the table.
   *
   * @default Json
   */
  dataFormat?: DataFormat;
  /**
   * Function which maps a record to its partition.
   */
  partitioner: (record: RuntimeShape<T>) => RuntimeShape<P>;
} & Omit<glue.TableProps, 'columns' | 'partitionKeys' | 'dataFormat'>;

/**
 * Represents a partitioned Glue Table.
 */
export class Table<T extends Shape, P extends Partition> extends glue.Table implements Client<Table.Client<T, P>> {
  public readonly compressed: boolean;
  /**
   * Rich model of the columns and partitions of the table.
   */
  public readonly shape: {
    columns: T;
    partitions: P;
  };
  public readonly columnsMapper: Mapper<RuntimeShape<T>, string>;
  public readonly partitionMappers: {
    [K in keyof P]: Mapper<RuntimeType<P[K]>, string>
  };

  constructor(scope: cdk.Construct, id: string, props: TableProps<T, P>) {
    super(scope, id, {
      ...props,
      dataFormat: (props.dataFormat || DataFormat.Json).format,
      columns: Object.entries(props.columns).map(([name, schema]) => ({
        name,
        type: schema.toGlueType()
      })),
      partitionKeys: Object.entries(props.partitions).map(([name, schema]) => {
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

    this.compressed = props.compressed === undefined ? false : props.compressed;

    this.shape = {
      columns: props.columns,
      partitions: props.partitions
    };
    this.columnsMapper = (props.dataFormat || DataFormat.Json).makeMapper(this.shape.columns);
    this.partitionMappers = {} as any;
    Object.entries(this.shape.partitions).forEach(([name, type]) => this.partitionMappers[name] = Json.forType(type) as any);
  }

  public install(target: Runtime): void {
    return this.readWrite().install(target);
  }

  public readWrite(): Client<Table.Client<T, P>> {
    return this.client(this.grantReadWrite.bind(this));
  }

  public read(): Client<Omit<Table.Client<T, P>, 'batchCreatePartition' | 'createPartition' | 'updatePartition'>> {
    return this.client(this.grantRead.bind(this));
  }

  public write(): Client<Omit<Table.Client<T, P>, 'getPartitions'>> {
    return this.client(this.grantWrite.bind(this));
  }

  private client<C>(grant: (grantable: iam.IGrantable) => void): Client<C> {
    return {
      install: (target) => {
        grant(target.grantable);
        target.properties.set('catalogId', this.database.catalogId);
        target.properties.set('databaseName', this.database.databaseName);
        target.properties.set('tableName', this.tableName);
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
      this
    );
  }
}

export namespace Table {
  export type GetPartitionsRequest = Omit<AWS.Glue.GetPartitionsRequest, 'CatalogId' | 'DatabaseName' | 'TableName'>;
  export type GetPartitionsResponse<P extends Partition> = {Partitions: Array<{
    Values: RuntimeShape<P>;
  } & Omit<AWS.Glue.Partition, 'Values'>>};

  export type CreatePartitionRequest<P extends Partition> = {Partition: RuntimeShape<P>, Location: string, LastAccessTime?: Date} &  Omit<AWS.Glue.PartitionInput, 'Values' | 'StorageDescriptor'>;
  export type CreatePartitionResponse = AWS.Glue.CreatePartitionResponse;

  export type BatchCreatePartitionRequestEntry<P extends Partition> = CreatePartitionRequest<P>;
  export type BatchCreatePartitionRequest<P extends Partition> = Array<BatchCreatePartitionRequestEntry<P>>;

  export type UpdatePartitionRequest<P extends Partition> = {Partition: RuntimeShape<P>, UpdatedPartition: CreatePartitionRequest<P>};

  export class Client<T extends Shape, P extends Partition> {
    private readonly partitions: string[];

    constructor(
      public readonly client: AWS.Glue,
      public readonly catalogId: string,
      public readonly databaseName: string,
      public readonly tableName: string,
      public readonly table: Table<T, P>
    ) {
      this.partitions = Object.keys(table.shape.partitions);
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
          Compressed: this.table.compressed,
          Location: request.Location,
          Columns: Object.entries(this.table.shape.columns).map(([name, type]) => {
            return {
              Name: name,
              Type: type.toGlueType().inputString
            };
          }),
          InputFormat: this.table.dataFormat.inputFormat.className,
          OutputFormat: this.table.dataFormat.outputFormat.className,
          SerdeInfo: {
            SerializationLibrary: this.table.dataFormat.serializationLibrary.className
          }
        }
      };
    }
  }
}