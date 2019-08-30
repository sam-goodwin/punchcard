import AWS = require('aws-sdk');

import dynamodb = require('@aws-cdk/aws-dynamodb');
import iam = require('@aws-cdk/aws-iam');
import core = require('@aws-cdk/core');

import { Namespace } from '../core/assembly';
import { Cache } from '../core/cache';
import { Dependency } from '../core/dependency';
import { Mapper } from '../shape/mapper/mapper';
import { RuntimeShape, Shape } from '../shape/shape';
import { struct } from '../shape/types/struct';
import { Omit } from '../util/omit';
import { Client } from './client';
import { Facade, toFacade } from './expression/path';
import { Key, keyType } from './key';
import * as Dynamo from './mapper';

export type TableProps<PKey extends keyof S, SKey extends keyof S | undefined, S extends Shape> = {
  partitionKey: PKey;
  sortKey?: SKey;
  shape: S;
} & Omit<dynamodb.TableProps, 'partitionKey' | 'sortKey'>;

/**
 * A DynamoDB Table.
 *
 * @typeparam S shape of data in the table.
 * @typeparam PKey name of partition key
 * @typeparam SKey name of sort key (if this table has one)
 */
export class Table<PKey extends keyof S, SKey extends keyof S | undefined, S extends Shape>
    extends dynamodb.Table
    implements Dependency<Client<PKey, SKey, S>> {
  /**
   * Shape of data in the table.
   */
  public readonly shape: S;

  /**
   * Shape of the table's key (hash key, or hash+sort key pair).
   */
  public readonly key: Key<S, PKey, SKey>;

  /**
   * Name of the partition key field.
   */
  public readonly partitionKey: PKey;

  /**
   * Name of the sort key field (if this table has one).
   */
  public readonly sortKey: SKey;

  /**
   * DynamoDB DSL for expressiong condition/update expressions on the table.
   */
  public readonly facade: Facade<S>;

  /**
   * Mapper for reading/writing the table's records.
   */
  public readonly mapper: Mapper<RuntimeShape<S>, AWS.DynamoDB.AttributeMap>;

  /**
   * Mapper for reading/writing the table's key.
   */
  public readonly keyMapper: Mapper<RuntimeShape<Key<S, PKey, SKey>>, AWS.DynamoDB.AttributeMap>;

  constructor(scope: core.Construct, id: string, props: TableProps<PKey, SKey, S>) {
    super(scope, id, toTableProps(props));

    function toTableProps(props: TableProps<any, any, any>): dynamodb.TableProps {
      const tableProps = {
        ...props,
        partitionKey: {
          name: props.partitionKey.toString(),
          type: keyType(props.shape[props.partitionKey].kind)
        }
      };
      if (props.sortKey) {
        tableProps.sortKey = {
          name: props.sortKey!.toString(),
          type: keyType(props.shape[props.sortKey].kind)
        };
      }
      return tableProps;
    }

    this.shape = props.shape;
    this.partitionKey = props.partitionKey;
    this.sortKey = props.sortKey!;
    this.key = {
      [this.partitionKey]: this.shape[this.partitionKey],
    } as any;
    if (this.sortKey) {
      (this.key as any)[this.sortKey] = this.shape[this.sortKey!];
    }
    this.mapper = new Dynamo.Mapper(struct(this.shape));
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
  public async bootstrap(namespace: Namespace, cache: Cache): Promise<Client<PKey, SKey, S>> {
    return new Client(this,
      namespace.get('tableName'),
      cache.getOrCreate('aws:dynamodb', () => new AWS.DynamoDB())) as Client<PKey, SKey, S>;
  }

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

  private _install(grant: (grantable: iam.IGrantable) => void): Dependency<Client<PKey, SKey, S>> {
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
  public readAccess(): Dependency<Client<PKey, SKey, S>> {
    return this._install(this.grantReadData.bind(this));
  }

  /**
   * Take a *read-write* dependency on this table.
   */
  public readWriteAccess(): Dependency<Client<PKey, SKey, S>> {
    return this._install(this.grantReadWriteData.bind(this));
  }

  /**
   * Take a *write-only* dependency on this table.
   */
  public writeAccess(): Dependency<Client<PKey, SKey, S>> {
    return this._install(this.grantWriteData.bind(this));
  }

  /**
   * Take a *full-access* dependency on this table.
   */
  public fullAccess(): Dependency<Client<PKey, SKey, S>> {
    return this._install(this.grantFullAccess.bind(this));
  }
}
