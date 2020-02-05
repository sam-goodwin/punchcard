import AWS = require('aws-sdk');

import dynamodb = require('@aws-cdk/aws-dynamodb');
import iam = require('@aws-cdk/aws-iam');
import core = require('@aws-cdk/core');

import { RecordType, Shape } from '@punchcard/shape';
import { DDB, TableClient } from '@punchcard/shape-dynamodb';
import { Build } from '../core/build';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import { Index, IndexProps } from './table-index';
import { getKeyNames, keyType } from './util';

export interface TableOverrideProps extends Omit<dynamodb.TableProps, 'partitionKey' | 'sortKey'> {}

export interface TableProps<TableRecord extends RecordType, Key extends DDB.KeyOf<TableRecord>> {
  data: TableRecord;
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
 * Then, when creating a table, you can specify just a hash key:
 * ```ts
 * const table = new DynamoDB.Table(stack, 'table', {
 *   data: Data,
 *   key: 'a' // name of the field to index on
 * });
 * ```
 *
 * ... or a [hash, sort] key pair as a tuple:
 * ```ts
 * const table = new DynamoDB.Table(stack, 'table', {
 *   data: Data,
 *   key: ['a', 'b'] // [hash, sort] key tuple
 * });
 * ```
 *
 * Use in a Function:
 * ```ts
 * new Lambda.Function(stack, 'id', {
 *   depends: table.readAccess()
 * }, async (request, table) => {
 *   await table.get('key');
 *   // if sorted:
 *   await table.get(['hash', 'sort]);
 *   // etc.
 * })
 * ```
 *
 * @typeparam TableRecord type of data in the table.
 * @typeparam Key either a hash key (string literal) or hash+sort key ([string, string] tuple)
 */
export class Table<TableRecord extends RecordType, Key extends DDB.KeyOf<TableRecord>> implements Resource<dynamodb.Table> {
  /**
   * The DynamoDB Table Construct.
   */
  public readonly resource: Build<dynamodb.Table>;

  /**
   * RecordType of data in the table.
   */
  public readonly dataType: TableRecord;

  /**
   * Shape of data in the table.
   */
  public readonly dataShape: Shape.Of<TableRecord>;

  /**
   * The table's key (hash key, or hash+sort key pair).
   */
  public readonly key: Key;

  constructor(scope: Build<core.Construct>, id: string, props: TableProps<TableRecord, Key>, buildProps?: Build<TableOverrideProps>) {
    this.dataType = props.data;
    this.dataShape = Shape.of(props.data) as any;

    this.key = props.key;
    const [partitionKeyName, sortKeyName] = getKeyNames<TableRecord>(props.key);

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

  public globalIndex<IndexKey extends DDB.KeyOf<Projection>, Projection extends RecordType = TableRecord>(
    props: Index.GlobalSecondaryIndexProps<this, Projection, IndexKey>): Index.Of<this, Projection, IndexKey> {

    return new Index({
      indexName: props.indexName,
      key: props.key,
      projection: props.projection,
      sourceTable: this
    }) as any;
  }

  /**
   * Take a *read-only* dependency on this table.
   */
  public readAccess(): Dependency<Table.ReadOnly<TableRecord, Key>> {
    return this.dependency((t, g) => t.grantReadData(g));
  }

  /**
   * Take a *read-write* dependency on this table.
   */
  public readWriteAccess(): Dependency<Table.ReadWrite<TableRecord, Key>> {
    return this.dependency((t, g) => t.grantReadWriteData(g));
  }

  /**
   * Take a *write-only* dependency on this table.
   */
  public writeAccess(): Dependency<Table.WriteOnly<TableRecord, Key>> {
    return this.dependency((t, g) => t.grantWriteData(g));
  }

  /**
   * Take a *full-access* dependency on this table.
   *
   * TODO: return type of Table.FullAccessClient?
   */
  public fullAccess(): Dependency<Table.ReadWrite<TableRecord, Key>> {
    return this.dependency((t, g) => t.grantFullAccess(g));
  }

  private dependency(grant: (table: dynamodb.Table, grantable: iam.IGrantable) => void): Dependency<TableClient<TableRecord, Key>> {
    return {
      install: this.resource.map(table => (ns, grantable) => {
        ns.set('tableName', table.tableName);
        grant(table, grantable);
      }),
      bootstrap: Run.of(async (ns, cache) =>
        new TableClient(this.dataType, this.key, {
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
  export interface ReadOnly<A extends RecordType, K extends DDB.KeyOf<InstanceType<A>>> extends Omit<TableClient<A, K>, 'put' | 'putBatch' | 'delete' | 'update'> {}

  /**
   * A DynamoDB Table with write-only permissions.
   *
   * Unavailable methods: `batchGet`, `get`, `scan`, `query`
   */
  export interface WriteOnly<A extends RecordType, K extends DDB.KeyOf<InstanceType<A>>> extends Omit<TableClient<A, K>, 'batchGet' | 'get' | 'scan' | 'query'> {}

  /**
   * A DynamODB Table with read and write permissions.
   */
  export interface ReadWrite<A extends RecordType, K extends DDB.KeyOf<InstanceType<A>>> extends TableClient<A, K> {}
}

export namespace Table {
  export type Data<T extends Table<any, any>> = T extends Table<infer D, any> ? D : never;
  export type Key<T extends Table<any, any>> = T extends Table<any, infer K> ? K : never;
}