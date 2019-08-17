import AWS = require('aws-sdk');

import dynamodb = require('@aws-cdk/aws-dynamodb');
import iam = require('@aws-cdk/aws-iam');
import core = require('@aws-cdk/core');

import { Dependency } from '../../compute';
import { Cache, Namespace } from '../../compute/assembly';
import { Mapper, RuntimeShape, Shape, struct } from "../../shape";
import { Omit } from '../../utils';
import { HashTableClient, HashTableClientImpl, SortedTableClient, SortedTableClientImpl, TableClient } from './client';
import { Facade, toFacade } from './expression/path';
import { CompositeKey, HashKey, keyType } from './key';

import * as Dynamo from './mapper';

/**
 * Interface for a DynamoDB Table.
 *
 * @typeparam S shape of data in the table
 * @typeparam K shape of the table's key (hash key, or hash+sort key pair)
 */
export interface ITable<S extends Shape, K extends Shape> extends dynamodb.Table {
  /**
   * Shape of data in the table.
   */
  readonly shape: S;
  /**
   * Shape of the table's key (hash key, or hash+sort key pair).
   */
  readonly key: K;
  /**
   * DynamoDB DSL for expressiong condition/update expressions on the table.
   */
  readonly facade: Facade<S>;
  /**
   * Mapper for reading/writing the table's records.
   */
  readonly mapper: Mapper<RuntimeShape<S>, AWS.DynamoDB.AttributeMap>;
  /**
   * Mapper for reading/writing the table's key.
   */
  readonly keyMapper: Mapper<RuntimeShape<K>, AWS.DynamoDB.AttributeMap>;
}

interface TableProps<S extends Shape, K extends Shape> {
  key: K;
  shape: S;
  props: dynamodb.TableProps
}

/**
 * Base class for both a `HashTable` and `SortedTable`.
 *
 * @typeparam C type of client for working with this table.
 * @typeparam S shape of data in the table.
 * @typeparam K shape of the table's key.
 */
abstract class Table<C extends TableClient<S, K>, S extends Shape, K extends Shape>
    extends dynamodb.Table implements Dependency<C>, ITable<S, K> {
  public readonly shape: S;
  public readonly key: K;
  public readonly facade: Facade<S>;
  public readonly mapper: Mapper<RuntimeShape<S>, AWS.DynamoDB.AttributeMap>;
  public readonly keyMapper: Mapper<RuntimeShape<K>, AWS.DynamoDB.AttributeMap>;

  constructor(scope: core.Construct, id: string, props: TableProps<S, K>) {
    super(scope, id, props.props);

    this.key = props.key;
    this.shape = props.shape;
    this.mapper = new Dynamo.Mapper(struct(props.shape));
    this.keyMapper = new Dynamo.Mapper(struct(this.key));
    this.facade = toFacade(props.shape);
  }

  /**
   * Create the client for the table by looking up the table name property
   * and initializing a DynamoDB client.
   *
   * @param namespace local properties set by this table by `install`
   * @param cache global cache shared by all clients
   */
  public async bootstrap(namespace: Namespace, cache: Cache): Promise<C> {
    return this.makeClient(
      namespace.get('tableName'),
      cache.getOrCreate('aws:dynamodb', () => new AWS.DynamoDB()));
  }

  /**
   * Make the client for this table.
   *
   * @param tableName name of the table.
   * @param client dynamodb client.
   */
  protected abstract makeClient(tableName: string, client: AWS.DynamoDB): C;

  /**
   * Set a runtime property for this table's name and grant permissions to the runtime's principal.
   *
   * Takes a *read-write* dependency on this table.
   *
   * @param target
   */
  public install(namespace: Namespace, grantable: iam.IGrantable): void {
    this.readWriteAccess().install(namespace, grantable);
  }

  private _install(grant: (grantable: iam.IGrantable) => void): Dependency<C> {
    return {
      install: (namespace: Namespace, grantable: iam.IGrantable) => {
        namespace.set('tableName', this.tableName);
        grant(grantable);
      },
      bootstrap: this.bootstrap.bind(this)
    };
  }

  /**
   * Take a *read-only* dependency on this table.
   */
  public readAccess(): Dependency<C> {
    return this._install(this.grantReadData.bind(this));
  }

  /**
   * Take a *read-write* dependency on this table.
   */
  public readWriteAccess(): Dependency<C> {
    return this._install(this.grantReadWriteData.bind(this));
  }

  /**
   * Take a *write-only* dependency on this table.
   */
  public writeAccess(): Dependency<C> {
    return this._install(this.grantWriteData.bind(this));
  }

  /**
   * Take a *full-access* dependency on this table.
   */
  public fullAccess(): Dependency<C> {
    return this._install(this.grantFullAccess.bind(this));
  }
}

/**
 * Properties for creating a `HashTable`.
 */
export type HashTableProps<S extends Shape, P extends keyof S> = {
  /**
   * Name of the partition key property.
   *
   * Must be a key of the table's shape.
   */
  partitionKey: P;

  /**
   * Shape of the table's data.
   */
  shape: S;
} & Omit<dynamodb.TableProps, 'partitionKey' | 'sortKey'>;

/**
 * A `HashTable` backed by DynamoDB.
 *
 * Hash-tables only have a partition key (no sort key); they *cannot* be queried.
 *
 * @typeparam S shape of data in the table
 * @typeparam P name of the partition key property
 */
export class HashTable<S extends Shape, P extends keyof S> extends Table<HashTableClient<S, P>, S, HashKey<S, P>> {
  /**
   * Name of the partition key property.
   */
  public readonly partitionKey: P;

  constructor(scope: core.Construct, id: string, props: HashTableProps<S, P>) {
    super(scope, id, {
      shape: props.shape,
      key: {
        [props.partitionKey.toString()]: props.shape[props.partitionKey]
      } as any,
      props: {
        ...props,
        partitionKey: {
          name: props.partitionKey.toString(),
          type: keyType(props.shape[props.partitionKey].kind)
        }
      }
    });
    this.partitionKey = props.partitionKey;
  }

  public makeClient(tableName: string, client: AWS.DynamoDB): HashTableClient<S, P> {
    return new HashTableClientImpl(this, tableName, client);
  }
}

/**
 * Properties for creating a `SortedTable`.
 *
 * @typeparam S shape of data in the table.
 * @typeparam PKey name of the partition key property.
 * @typeparam SKey name of the sort key property.
 */
export type SortedTableProps<S, PKey extends keyof S, SKey extends keyof S> = {
  /**
   * Shape of data in the table.
   */
  shape: S;
  /**
   * Name of the partition key property.
   */
  partitionKey: PKey;
  /**
   * Name of the sort key property.
   */
  sortKey: SKey;
} & Omit<dynamodb.TableProps, 'partitionKey' | 'sortKey'>;

/**
 * A `SortedTable` backed by DynamoDB.
 *
 * Sorted tables have both a partition key and sort key; *they *can* be queried.
 *
 * @typeparam S shape of data in the table
 * @typeparam P name of the partition key property
 */
export class SortedTable<S extends Shape, PKey extends keyof S, SKey extends keyof S>
    extends Table<SortedTableClient<S, PKey, SKey>, S, CompositeKey<S, PKey, SKey>> {
  public readonly partitionKey: PKey;
  public readonly partitionKeyType: dynamodb.AttributeType;
  public readonly sortKey: SKey;
  public readonly sortKeyType: dynamodb.AttributeType;

  constructor(scope: core.Construct, id: string, props: SortedTableProps<S, PKey, SKey>) {
    super(scope, id, {
      shape: props.shape,
      key: {
        [props.partitionKey.toString()]: props.shape[props.partitionKey],
        [props.sortKey.toString()]: props.shape[props.partitionKey]
      } as any,
      props: {
        ...props,
        partitionKey: {
          name: props.partitionKey.toString(),
          type: keyType(props.shape[props.partitionKey].kind)
        },
        sortKey: {
          name: props.sortKey.toString(),
          type: keyType(props.shape[props.sortKey].kind)
        }
      }
    });
    this.partitionKey = props.partitionKey;
    this.partitionKeyType = keyType(this.shape[this.partitionKey].kind);
    this.sortKey = props.sortKey;
    this.sortKeyType = keyType(this.shape[this.sortKey].kind);
  }

  protected makeClient(tableName: string, client: AWS.DynamoDB): SortedTableClient<S, PKey, SKey> {
    return new SortedTableClientImpl(this, tableName, client);
  }
}
