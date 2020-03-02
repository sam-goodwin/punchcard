import AWS = require('aws-sdk');

import dynamodb = require('@aws-cdk/aws-dynamodb');
import iam = require('@aws-cdk/aws-iam');
import core = require('@aws-cdk/core');

import { ArrayShape, BinaryShape, BoolShape, IntegerShape, MapShape, NumberShape, NumericShape, RecordShape, RecordType, Shape, ShapeOrRecord, StringShape, TimestampShape, Value } from '@punchcard/shape';
import { DDB, TableClient, AttributeValue } from '@punchcard/shape-dynamodb';
import { StructShape } from '@punchcard/shape/lib/struct';
import { Build } from '../core/build';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import { Task } from '../step-functions/task';
import { Thing } from '../step-functions/thing';
import { Index } from './table-index';
import { getKeyNames, keyType } from './util';

import { Record } from '../step-functions/thing';

/**
 * Subset of the CDK's DynamoDB TableProps that can be overriden.
 */
export interface TableOverrideProps extends Omit<dynamodb.TableProps, 'partitionKey' | 'sortKey'> {}

/**
 * TableProps for creating a new DynamoDB Table.
 *
 * @typeparam DataType type of data in the Table.
 * @typeparam Key partition and optional sort keys of the Table (members of DataType)
 */
export interface TableProps<DataType extends RecordType, Key extends DDB.KeyOf<DataType>> {
  /**
   * Type of data in the Table.
   */
  data: DataType;
  /**
   * Partition and (optional) Sort Key of the Table.
   */
  key: Key;
}

/**
 * Represents a DynamoDB Table.
 *
 * The data in a table is desciberd with a Record:
 * ```ts
 * class Data extends Record({
 *  a: integer,
 *  b: number,
 *  c: timestamp,
 *  d: map(string),
 * }) {}
 * ```
 *
 * Then, when creating a table, you can specify just a partition key:
 * ```ts
 * const table = new DynamoDB.Table(stack, 'table', {
 *   data: Data,
 *   key: {
 *     partition: 'a'
 *   }
 * });
 * ```
 *
 * ... or a partition and sort key:
 * ```ts
 * const table = new DynamoDB.Table(stack, 'table', {
 *   data: Data,
 *   key: {
 *     partition: 'a',
 *     sort: 'b'
 *   }
 * });
 * ```
 *
 * Use in a Function:
 * ```ts
 * new Lambda.Function(stack, 'id', {
 *   depends: table.readAccess()
 * }, async (request, table) => {
 *   // partitio key only
 *   await table.get({
 *     a: 'partition key'
 *   });
 *
 *   // if sort key provided:
 *   await table.get({
 *     a: 'partition key',
 *     b: 'sort key'
 *   });
 *
 *   // etc.
 * })
 * ```
 *
 * @typeparam DataType type of data in the Table.
 * @typeparam Key either a hash key (string literal) or hash+sort key ([string, string] tuple)
 */
export class Table<DataType extends RecordType, Key extends DDB.KeyOf<DataType>> implements Resource<dynamodb.Table>, Task.DSL<Table.StepFunctionInterface<DataType, Key>> {
  /**
   * The DynamoDB Table Construct.
   */
  public readonly resource: Build<dynamodb.Table>;

  /**
   * RecordType of data in the table.
   */
  public readonly dataType: DataType;

  /**
   * Shape of data in the table.
   */
  public readonly dataShape: Shape.Of<DataType>;

  /**
   * The table's key (hash key, or hash+sort key pair).
   */
  public readonly key: Key;

  constructor(scope: Build<core.Construct>, id: string, props: TableProps<DataType, Key>, buildProps?: Build<TableOverrideProps>) {
    this.dataType = props.data;
    this.dataShape = Shape.of(props.data) as any;

    this.key = props.key;
    const [partitionKeyName, sortKeyName] = getKeyNames<DataType>(props.key);

    this.resource = (buildProps || Build.of({})).chain(extraTableProps => scope.map(scope => {
      return new dynamodb.Table(scope, id, {
        ...extraTableProps,
        partitionKey: {
          name: partitionKeyName,
          type: keyType((this.dataShape.Members as any)[partitionKeyName].Shape)
        },
        sortKey: sortKeyName ? {
          name: sortKeyName,
          type: keyType((this.dataShape.Members as any)[sortKeyName].Shape)
        } : undefined
      });
    }));
  }

  public [Task.DSL](): Table.StepFunctionInterface<DataType, Key> {
    return new Table.StepFunctionInterface(this);
  }

  /**
   * Project this table to a subset of its properties.
   *
   * Best done by "Picking" properties from the table's RecordType:
   * ```ts
   * class TableData extends Record({
   *   a: string,
   *   b: string,
   *   c: string,
   *   d: string,
   * }) {}
   * const table = new DynamoDB.Table(.., {
   *   data: TableData,
   *   // etc.
   * }});
   *
   * const TableProjection extends TableData.Pick(['a', 'b']) {}
   *
   * table.projectTo(TableProjection)
   * ```
   * @param projection type of projected data (subset of the Table's properties)
   */
  public projectTo<Projection extends RecordType>(projection: AssertValidProjection<DataType, Projection>): Projected<this, Projection> {
    return new Projected(this, projection) as any;
  }

  /**
   * Creates a global index that projects ALL attributes.
   *
   * To create a projected gobal index, first call `projectTo` on this table.
   *
   * @param props Global Index props such as name and key information.
   */
  public globalIndex<IndexKey extends DDB.KeyOf<DataType>>(
      props: Index.GlobalProps<DataType, IndexKey>):
        Index.Of<this, DataType, IndexKey> {
    return new Index({
      indexType: 'global',
      indexName: props.indexName,
      key: props.key,
      projection: this.dataType,
      sourceTable: this
    }) as any;
  }

  /**
   * Take a *read-only* dependency on this table.
   */
  public readAccess(): Dependency<Table.ReadOnly<DataType, Key>> {
    return this.dependency((t, g) => t.grantReadData(g));
  }

  /**
   * Take a *read-write* dependency on this table.
   */
  public readWriteAccess(): Dependency<Table.ReadWrite<DataType, Key>> {
    return this.dependency((t, g) => t.grantReadWriteData(g));
  }

  /**
   * Take a *write-only* dependency on this table.
   */
  public writeAccess(): Dependency<Table.WriteOnly<DataType, Key>> {
    return this.dependency((t, g) => t.grantWriteData(g));
  }

  /**
   * Take a *full-access* dependency on this table.
   *
   * TODO: return type of Table.FullAccessClient?
   */
  public fullAccess(): Dependency<Table.ReadWrite<DataType, Key>> {
    return this.dependency((t, g) => t.grantFullAccess(g));
  }

  private dependency(grant: (table: dynamodb.Table, grantable: iam.IGrantable) => void): Dependency<TableClient<DataType, Key>> {
    return {
      install: this.resource.map(table => (ns, grantable) => {
        ns.set('tableName', table.tableName);
        grant(table, grantable);
      }),
      bootstrap: Run.of(async (ns, cache) =>
        new TableClient({
          data: this.dataType,
          key: this.key,
          tableName: ns.get('tableName'),
          client: cache.getOrCreate('aws:dynamodb', () => new AWS.DynamoDB())
        }))
    };
  }
}

export namespace Table {
  /**
   * A DynamoDB Table with read-only permissions.
   *
   * Unavailable methods: `put`, `putBatch`, `delete`, `update`.
   */
  export interface ReadOnly<A extends RecordType, K extends DDB.KeyOf<A>> extends Omit<TableClient<A, K>, 'put' | 'putBatch' | 'delete' | 'update'> {}

  /**
   * A DynamoDB Table with write-only permissions.
   *
   * Unavailable methods: `batchGet`, `get`, `scan`, `query`
   */
  export interface WriteOnly<A extends RecordType, K extends DDB.KeyOf<A>> extends Omit<TableClient<A, K>, 'batchGet' | 'get' | 'scan' | 'query'> {}

  /**
   * A DynamODB Table with read and write permissions.
   */
  export interface ReadWrite<A extends RecordType, K extends DDB.KeyOf<A>> extends TableClient<A, K> {}
}

export namespace Table {
  export type Data<T extends Table<any, any>> = T extends Table<infer D, any> ? D : never;
  export type Key<T extends Table<any, any>> = T extends Table<any, infer K> ? K : never;
}

type AssertValidProjection<T extends RecordType, P extends RecordType> = T['members'] extends P['members'] ? P : never;

/**
 * Represents a Projection of some DynamoDB Table.
 *
 * Used to build projected Secondary Indexes or (todo) Streams.
 *
 * @typeparam SourceTable the projected table
 * @typeparam Projection the type of projected data
 */
export class Projected<SourceTable extends Table<any, any>, Projection extends RecordType> {
  constructor(public readonly sourceTable: SourceTable, public readonly projection: Projection) {}

  public globalIndex<IndexKey extends DDB.KeyOf<Projection>>(
      props: Index.GlobalProps<Projection, IndexKey>):
        Index.Of<SourceTable, Projection, IndexKey> {
    return new Index({
      indexName: props.indexName,
      indexType: 'global',
      key: props.key,
      projection: this.projection,
      sourceTable: this.sourceTable
    }) as any;
  }
}

export namespace Table {
  export class StepFunctionInterface<DataType extends RecordType, Key extends DDB.KeyOf<DataType>> {
    constructor(public readonly table: Table<DataType, Key>) {}

    public put(item: Value.Of<DataType>): Generator<unknown, void /* TODO: response type*/>;
    public put(item: Thing.Value<AttributeValue.ShapeOf<DataType>>['M']): Generator<unknown, void /* TODO: response type*/>;
    public put(item: any): any {
      return null as any;
    }
  }
}
