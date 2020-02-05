import AWS = require('aws-sdk');

import dynamodb = require('@aws-cdk/aws-dynamodb');
import iam = require('@aws-cdk/aws-iam');

import { Build } from '../core/build';
import { Dependency } from '../core/dependency';
import { Run } from '../core/run';

import { RecordType, Shape } from '@punchcard/shape';

import { DDB, IndexClient } from '@punchcard/shape-dynamodb';
import { Table, TableOverrideProps } from './table';
import { getKeyNames, keyType } from './util';

export interface IndexProps<T extends Table<any, any>, Projection extends RecordType, Key extends DDB.KeyOf<Projection>> {
  sourceTable: T;
  indexName: string;
  projection: Projection;
  key: Key;
}

/**
 * Represents an Index of a DynamoDB Table
 */
export class Index<SourceTable extends Table<any, any>, Projection extends RecordType, Key extends DDB.KeyOf<Projection>> {
  /**
   * Source Table of this Index.
   */
  public readonly sourceTable: SourceTable;

  /**
   * Shape of data in the table.
   */
  public readonly projection: Projection;

  /**
   * Shape of data in the table.
   */
  public readonly projectionShape: Shape.Of<Projection>;

  /**
   * The table's key (hash key, or hash+sort key pair).
   */
  public readonly key: Key;

  /**
   * Name of the Index.
   */
  public readonly indexName: string;

  constructor(props: IndexProps<SourceTable, Projection, Key>, buildProps?: Build<TableOverrideProps>) {
    this.sourceTable = props.sourceTable;
    if (!props.projection) {
      props.projection = this.projection as any;
    }

    const type: any = props.projection;

    const [partitionKeyName, sortKeyName] = getKeyNames<Projection>(props.key);

    this.sourceTable.resource.chain(table => (buildProps || Build.of({})).map(tableProps => {
      table.addGlobalSecondaryIndex({
        ...tableProps,
        indexName: props.indexName,
        partitionKey: {
          name: partitionKeyName,
          type: keyType(type[partitionKeyName])
        },
        sortKey: sortKeyName ? {
          name: sortKeyName,
          type: keyType(type[sortKeyName])
        } : undefined,
      });
    }));
    this.projection = props.projection;
    this.projectionShape = Shape.of(props.projection) as any;

    this.key = props.key;
  }

  /**
   * Provides access to scan and query the Index.
   */
  public readAccess(): Dependency<IndexClient<Projection, Key>> {
    return this.dependency((table, target) => {
      table.grantReadData(target);
    });
  }

  // TODO: ??
  // public readonly queryAccess()
  // public readonly scanAccess()

  private dependency(grant: (table: dynamodb.Table, grantable: iam.IGrantable) => void): Dependency<IndexClient<Projection, Key>> {
    return {
      install: this.sourceTable.resource.map(table => (ns, grantable) => {
        ns.set('tableName', table.tableName);
        ns.set('indexName', this.indexName);
        grant(table, grantable);
      }),
      bootstrap: Run.of(async (ns, cache) =>
        new IndexClient(this.projection, this.key, {
          tableName: ns.get('tableName'),
          indexName: ns.get('indexName'),
          client: cache.getOrCreate('aws:dynamodb', () => new AWS.DynamoDB())
        }))
    };
  }
}

export namespace Index {
  export type Of<SourceTable extends Table<any, any>, Projection extends RecordType, Key extends DDB.KeyOf<Projection>>
    = Index<
      SourceTable,
      Table.Data<SourceTable>['members'] extends Projection['members'] ? Projection : never,
      Key>;

  type _GlobalSecondaryIndexProps<SourceTable extends Table<any, any>, Projection extends RecordType, Key extends DDB.KeyOf<Projection>> =
  Omit<IndexProps<SourceTable, Projection, Key>, 'sourceTable'> & {
    /**
     * Read capacity of the Index.
     */
    readCapacity?: number;
    /**
     * Write capacity of the Index.
     */
    writerCapacity?: number;
  };
  export interface GlobalSecondaryIndexProps<SourceTable extends Table<any, any>, Projection extends RecordType, Key extends DDB.KeyOf<Projection>, >
    extends _GlobalSecondaryIndexProps<
      /**
       * Source Table index was created from.
       */
      SourceTable,
      /**
       * Type representing the projection.
       *
       * AssertExtends ensures that the Projection type is a subset of the SourceTable's data.
       */
      Table.Data<SourceTable>['members'] extends Projection['members'] ? Projection : never,
      /**
       * Key structure of the Index.
       */
      Key> {}
}