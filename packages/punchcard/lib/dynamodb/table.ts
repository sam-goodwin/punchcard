import AWS = require('aws-sdk');

import type * as dynamodb from '@aws-cdk/aws-dynamodb';
import type * as iam from '@aws-cdk/aws-iam';

import { Pointer, RecordShape, Shape } from '@punchcard/shape';
import { DDB, TableClient } from '@punchcard/shape-dynamodb';
import { StatementF } from '../appsync/resolver/statement';
import { GraphQL } from '../appsync/types';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Construct, Scope } from '../core/construct';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import { KeyGraphQLRepr, getDynamoDBItem } from './resolver';
import { Index } from './table-index';
import { getKeyNames, keyType } from './util';

/**
 * Subset of the CDK's DynamoDB TableProps that can be overriden.
 */
export interface TableOverrideProps extends Omit<dynamodb.TableProps, 'partitionKey' | 'sortKey'> {}

export interface BaseTableProps {
  /**
   * Override the table infrastructure props.
   *
   * Example:
   * ```ts
   * new DynamoDB.Table(scope, 'Table', {
   *   tableProps: CDK.map(({dynamodb}) => ({
   *     billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
   *   }))
   * });
   * ```
   */
  tableProps?: Build<TableOverrideProps>
}

/**
 * TableProps for creating a new DynamoDB Table.
 *
 * @typeparam DataType type of data in the Table.
 * @typeparam Key partition and optional sort keys of the Table (members of DataType)
 */
export interface TableProps<DataType extends Shape.Like<RecordShape>, Key extends DDB.KeyOf<Shape.Resolve<DataType>>> extends BaseTableProps {
  /**
   * Type of data in the Table.
   */
  data: Pointer<DataType>;
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
export class Table<DataType extends Shape.Like<RecordShape>, Key extends DDB.KeyOf<Shape.Resolve<DataType>>>
    extends Construct implements Resource<dynamodb.Table> {
  /**
   * The DynamoDB Table Construct.
   */
  public readonly resource: Build<dynamodb.Table>;

  /**
   * RecordShape of data in the table.
   */
  public readonly dataType: Pointer<DataType>;

  /**
   * The table's key (hash key, or hash+sort key pair).
   */
  public readonly key: Key;

  constructor(scope: Scope, id: string, props: TableProps<DataType, Key>) {
    super(scope, id);

    this.dataType = props.data;

    this.key = props.key;
    const [partitionKeyName, sortKeyName] = getKeyNames<Shape.Resolve<DataType>>(props.key);

    this.resource = CDK.chain(({dynamodb}) => Scope.resolve(scope).map(scope => {
      const extraTableProps = props.tableProps ? Build.resolve(props.tableProps) : {};

      const dataType = Shape.resolve(Pointer.resolve(this.dataType));

      return new dynamodb.Table(scope, id, {
        ...extraTableProps,
        partitionKey: {
          name: partitionKeyName,
          type: keyType((dataType.Members as any)[partitionKeyName].Shape)
        },
        sortKey: sortKeyName ? {
          name: sortKeyName,
          type: keyType((dataType.Members as any)[sortKeyName].Shape)
        } : undefined
      });
    }));
  }

  public get(key: KeyGraphQLRepr<Shape.Resolve<DataType>, Key>): StatementF<GraphQL.TypeOf<Shape.Resolve<DataType>>> {
    return getDynamoDBItem(this, key);
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
  public projectTo<Projection extends RecordShape>(projection: AssertValidProjection<Shape.Resolve<DataType>, Projection>): Projected<this, Projection> {
    return new Projected(this, projection) as any;
  }

  /**
   * Creates a global index that projects ALL attributes.
   *
   * To create a projected gobal index, first call `projectTo` on this table.
   *
   * @param props Global Index props such as name and key information.
   */
  public globalIndex<IndexKey extends DDB.KeyOf<Shape.Resolve<DataType>>>(
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

  private dependency(grant: (table: dynamodb.Table, grantable: iam.IGrantable) => void): Dependency<TableClient<Shape.Resolve<DataType>, Key>> {
    return {
      install: this.resource.map(table => (ns, grantable) => {
        ns.set('tableName', table.tableName);
        grant(table, grantable);
      }),
      bootstrap: Run.of(async (ns, cache) =>
        new TableClient({
          data: Pointer.resolve(this.dataType) as any,
          key: this.key as any,
          tableName: ns.get('tableName'),
          client: cache.getOrCreate('aws:dynamodb', () => new AWS.DynamoDB())
        }))
    };
  }
}

export namespace Table {
  export function NewType<DataType extends Shape.Like<RecordShape>, Key extends DDB.KeyOf<Shape.Resolve<DataType>>>(
    input: { data: Pointer<DataType>, key: Key }):
      Construct.Class<Table<DataType, Key>, BaseTableProps> {
        return class extends Table<DataType, Key> {
          constructor(scope: Scope, id: string, props: BaseTableProps) {
            super(scope, id, {
              ...props,
              ...input
            });
          }
        } as any;
      }
  /**
   * A DynamoDB Table with read-only permissions.
   *
   * Unavailable methods: `put`, `putBatch`, `delete`, `update`.
   */
  export interface ReadOnly<A extends Shape.Like<RecordShape>, K extends DDB.KeyOf<Shape.Resolve<A>>> extends Omit<TableClient<Shape.Resolve<A>, K>, 'put' | 'putBatch' | 'delete' | 'update'> {}

  /**
   * A DynamoDB Table with write-only permissions.
   *
   * Unavailable methods: `batchGet`, `get`, `scan`, `query`
   */
  export interface WriteOnly<A extends Shape.Like<RecordShape>, K extends DDB.KeyOf<Shape.Resolve<A>>> extends Omit<TableClient<Shape.Resolve<A>, K>, 'batchGet' | 'get' | 'scan' | 'query'> {}

  /**
   * A DynamODB Table with read and write permissions.
   */
  export interface ReadWrite<A extends Shape.Like<RecordShape>, K extends DDB.KeyOf<Shape.Resolve<A>>> extends TableClient<Shape.Resolve<A>, K> {}
}

export namespace Table {
  export type Data<T extends Table<any, any>> = T extends Table<infer D, any> ? Shape.Resolve<D> : never;
  export type Key<T extends Table<any, any>> = T extends Table<any, infer K> ? K : never;
}

type AssertValidProjection<T extends RecordShape, P extends RecordShape> = T['Members'] extends P['Members'] ? P : never;

/**
 * Represents a Projection of some DynamoDB Table.
 *
 * Used to build projected Secondary Indexes or (todo) Streams.
 *
 * @typeparam SourceTable the projected table
 * @typeparam Projection the type of projected data
 */
export class Projected<SourceTable extends Table<any, any>, Projection extends Shape.Like<RecordShape>> {
  constructor(public readonly sourceTable: SourceTable, public readonly projection: Projection) {}

  public globalIndex<IndexKey extends DDB.KeyOf<Shape.Resolve<Projection>>>(
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