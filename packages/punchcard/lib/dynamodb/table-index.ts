import AWS = require('aws-sdk');

import dynamodb = require('@aws-cdk/aws-dynamodb');
import iam = require('@aws-cdk/aws-iam');

import { Dependency } from '../core/dependency';
import { Run } from '../core/run';

import { RecordType, Shape } from '@punchcard/shape';

import { ProjectionType } from '@aws-cdk/aws-dynamodb';
import { DDB, IndexClient } from '@punchcard/shape-dynamodb';
import { Table } from './table';
import { getKeyNames, keyType } from './util';

export interface IndexProps<T extends Table<any, any>, Projection extends RecordType, Key extends DDB.KeyOf<Projection>> {
  sourceTable: T;
  indexName: string;
  projection: Projection;
  key: Key;
  indexType: 'global' | 'local';
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

  constructor(props: IndexProps<SourceTable, Projection, Key>) {
    this.sourceTable = props.sourceTable;
    if (!props.projection) {
      props.projection = this.projection as any;
    }

    const type: any = props.projection;

    const [partitionKeyName, sortKeyName] = getKeyNames<Projection>(props.key);

    this.sourceTable.resource.map(table => {
      const partitionKey = {
        name: partitionKeyName,
        type: keyType(type[partitionKeyName])
      };
      const sortKey = sortKeyName ? {
        name: sortKeyName,
        type: keyType(type[sortKeyName])
      } : undefined;

      // the names of both the table and the index's partition+sort keys.
      // projections are required to at least have these properties
      const KEY_MEMBERS = new Set([
        ...(typeof props.sourceTable.key === 'string' ? [props.sourceTable.key] : props.sourceTable.key),
        partitionKeyName,
        sortKeyName
      ].filter(_ => _ !== undefined));

      // name of the properties in the projection
      const PROJECTION_MEMBERS = new Set(Object.keys(props.projection.members));
      for (const KEY of KEY_MEMBERS.values()) {
        if (!PROJECTION_MEMBERS.has(KEY)) {
          throw new Error(`invalid projection, missing key: ${KEY}`);
        }
      }

      // all properties in the Table
      const TABLE_MEMBERS = new Set(Object.keys(props.sourceTable.dataType.members));

      const projectionType =
        PROJECTION_MEMBERS.size === TABLE_MEMBERS.size ? ProjectionType.ALL :
        PROJECTION_MEMBERS.size === KEY_MEMBERS.size ? ProjectionType.KEYS_ONLY :
        ProjectionType.INCLUDE
        ;

      const definition: any = {
        indexName: props.indexName,
        partitionKey,
        sortKey,
        projectionType,
      };
      if (projectionType === ProjectionType.INCLUDE) {
        definition.nonKeyAttributes = Array.from(PROJECTION_MEMBERS.values()).filter(p => !KEY_MEMBERS.has(p));
      }
      if (props.indexType === 'global') {
        table.addGlobalSecondaryIndex(definition);
      } else {
        if (definition.sortKey === undefined) {
          throw new Error(`sortKey cannot be undefined when creating a Local Secondary Index`);
        }
        delete definition.partitionKey;
        table.addLocalSecondaryIndex(definition);
      }
    });
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

  export interface GlobalProps<Projection extends RecordType, Key extends DDB.KeyOf<Projection>> {
    indexName: string;

    key: Key;

    /**
     * Read capacity of the Index.
     */
    readCapacity?: number;
    /**
     * Write capacity of the Index.
     */
    writerCapacity?: number;
  }

  export interface LocalProps<Projection extends RecordType, Key extends keyof Projection['members']> {
    indexName: string;

    key: Key;

    /**
     * Read capacity of the Index.
     */
    readCapacity?: number;
    /**
     * Write capacity of the Index.
     */
    writerCapacity?: number;
  }
}