import AWS = require('aws-sdk');

import dynamodb = require('@aws-cdk/aws-dynamodb');
import iam = require('@aws-cdk/aws-iam');
import core = require('@aws-cdk/core');

import { Build } from '../core/build';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Run } from '../core/run';
import { Mapper } from '../shape/mapper/mapper';
import { RuntimeShape, Shape } from '../shape/shape';
import { struct, StructShape } from '../shape/struct';
import { Client } from './client';
import { DSL, toDSL } from './expression/path';
import { Key, keyType } from './key';
import * as Dynamo from './mapper';

/**
 * A Table's Attributes.
 */
export type Attributes = {
  [attributeName: string]: Shape<any>;
};

export interface TableProps<PKey extends keyof A, SKey extends keyof A | undefined, A extends Attributes> {
  partitionKey: PKey;
  sortKey?: SKey;
  attributes: A;
  tableProps?: Build<Omit<dynamodb.TableProps, 'partitionKey' | 'sortKey'>>
}

/**
 * A DynamoDB Table.
 *
 * @typeparam S shape of data in the table.
 * @typeparam PKey name of partition key
 * @typeparam SKey name of sort key (if this table has one)
 */
export class Table<PKey extends keyof A, SKey extends keyof A | undefined, A extends Attributes> implements Resource<dynamodb.Table> {
  /**
   * The DynamoDB Table Construct.
   */
  public readonly resource: Build<dynamodb.Table>;

  /**
   * Shape of data in the table.
   */
  public readonly attributes: A;

  /**
   * StructShape of the table's key (hash key, or hash+sort key pair).
   */
  public readonly key: Key<A, PKey, SKey>;

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
  public readonly facade: DSL<A>;

  /**
   * Mapper for reading/writing the table's records.
   */
  public readonly mapper: Mapper<RuntimeShape<StructShape<A>>, AWS.DynamoDB.AttributeMap>;

  /**
   * Mapper for reading/writing the table's key.
   */
  public readonly keyMapper: Mapper<RuntimeShape<StructShape<Key<A, PKey, SKey>>>, AWS.DynamoDB.AttributeMap>;

  constructor(scope: Build<core.Construct>, id: string, props: TableProps<PKey, SKey, A>) {
    this.resource = (props.tableProps || Build.of({})).chain(extraTableProps => scope.map(scope => {
      const tableProps: any = {
        ...extraTableProps,
        partitionKey: {
          name: props.partitionKey.toString(),
          type: keyType(props.attributes[props.partitionKey].kind)
        }
      };
      if (props.sortKey) {
        tableProps.sortKey = {
          name: props.sortKey!.toString(),
          type: keyType(props.attributes[props.sortKey as any].kind)
        };
      }

      return new dynamodb.Table(scope, id, tableProps as dynamodb.TableProps);
    }));

    this.attributes = props.attributes;
    this.partitionKey = props.partitionKey;
    this.sortKey = props.sortKey!;
    const key: Partial<Key<A, PKey, SKey>> = {
      [this.partitionKey]: this.attributes[this.partitionKey],
    } as any;
    if (this.sortKey) {
      (key as any)[this.sortKey] = this.attributes[this.sortKey!];
    }
    this.key = key as Key<A, PKey, SKey>;
    this.mapper = new Dynamo.Mapper(struct(this.attributes));
    this.keyMapper = new Dynamo.Mapper(struct(this.key));
    this.facade = toDSL(props.attributes);
  }

  /**
   * Take a *read-only* dependency on this table.
   */
  public readAccess(): Dependency<Client<PKey, SKey, A>> {
    return this.dependency((t, g) => t.grantReadData(g));
  }

  /**
   * Take a *read-write* dependency on this table.
   */
  public readWriteAccess(): Dependency<Client<PKey, SKey, A>> {
    return this.dependency((t, g) => t.grantReadWriteData(g));
  }

  /**
   * Take a *write-only* dependency on this table.
   */
  public writeAccess(): Dependency<Client<PKey, SKey, A>> {
    return this.dependency((t, g) => t.grantWriteData(g));
  }

  /**
   * Take a *full-access* dependency on this table.
   */
  public fullAccess(): Dependency<Client<PKey, SKey, A>> {
    return this.dependency((t, g) => t.grantFullAccess(g));
  }

  private dependency(grant: (table: dynamodb.Table, grantable: iam.IGrantable) => void): Dependency<Client<PKey, SKey, A>> {
    return {
      install: this.resource.map(table => (ns, grantable) => {
        ns.set('tableName', table.tableName);
        grant(table, grantable);
      }),
      bootstrap: Run.of(async (ns, cache) =>
        new Client(
          this,
          ns.get('tableName'),
          cache.getOrCreate('aws:dynamodb', () => new AWS.DynamoDB())) as Client<PKey, SKey, A>)
    };
  }
}
