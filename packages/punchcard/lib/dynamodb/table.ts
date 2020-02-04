import AWS = require('aws-sdk');

import dynamodb = require('@aws-cdk/aws-dynamodb');
import iam = require('@aws-cdk/aws-iam');
import core = require('@aws-cdk/core');

import { Build } from '../core/build';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { Run } from '../core/run';

import { Meta, RecordType, Shape, ShapeGuards } from '@punchcard/shape';

import { DynamoDBClient } from '@punchcard/shape-dynamodb';

/**
 * A Table's Attributes.
 */
export type Attributes = RecordType;

export interface TableOverrideProps extends Omit<dynamodb.TableProps, 'partitionKey' | 'sortKey'> {}

/**
 * A DynamoDB Table.
 *
 * @typeparam S shape of data in the table.
 * @typeparam PKey name of partition key
 * @typeparam SKey name of sort key (if this table has one)
 */
export class Table<A extends Attributes, K extends DynamoDBClient.Key<A>> implements Resource<dynamodb.Table> {
  /**
   * The DynamoDB Table Construct.
   */
  public readonly resource: Build<dynamodb.Table>;

  /**
   * Shape of data in the table.
   */
  public readonly attributes: Shape.Of<A>;

  /**
   * The table's key (hash key, or hash+sort key pair).
   */
  public readonly key: K;

  constructor(scope: Build<core.Construct>, id: string, attributes: A, tableKey: K, props?: Build<TableOverrideProps>) {
    this.attributes = Shape.of(attributes) as any;

    this.key = tableKey;
    const partitionKeyName: string = typeof tableKey === 'string' ? tableKey : (tableKey as any)[0];
    const sortKeyName: string | undefined = typeof tableKey === 'string' ? undefined : (tableKey as any)[1];

    this.resource = (props || Build.of({})).chain(extraTableProps => scope.map(scope => {
      const tableProps: any = {
        ...extraTableProps,
        partitionKey: {
          name: typeof tableKey === 'string' ? tableKey : (tableKey as any)[0],
          type: keyType((this.attributes.Members as any)[partitionKeyName].Shape)
        }
      };
      if (sortKeyName) {
        tableProps.sortKey = {
          name: sortKeyName,
          type: keyType((this.attributes.Members as any)[sortKeyName].Shape)
        };
      }

      return new dynamodb.Table(scope, id, tableProps as dynamodb.TableProps);
    }));
  }

  /**
   * Take a *read-only* dependency on this table.
   */
  public readAccess(): Dependency<Table.ReadOnly<A, K>> {
    return this.dependency((t, g) => t.grantReadData(g));
  }

  /**
   * Take a *read-write* dependency on this table.
   */
  public readWriteAccess(): Dependency<Table.ReadWrite<A, K>> {
    return this.dependency((t, g) => t.grantReadWriteData(g));
  }

  /**
   * Take a *write-only* dependency on this table.
   */
  public writeAccess(): Dependency<Table.WriteOnly<A, K>> {
    return this.dependency((t, g) => t.grantWriteData(g));
  }

  /**
   * Take a *full-access* dependency on this table.
   *
   * TODO: return type of Table.FullAccessClient?
   */
  public fullAccess(): Dependency<Table.ReadWrite<A, K>> {
    return this.dependency((t, g) => t.grantFullAccess(g));
  }

  private dependency(grant: (table: dynamodb.Table, grantable: iam.IGrantable) => void): Dependency<DynamoDBClient<A, K>> {
    return {
      install: this.resource.map(table => (ns, grantable) => {
        ns.set('tableName', table.tableName);
        grant(table, grantable);
      }),
      bootstrap: Run.of(async (ns, cache) =>
        new DynamoDBClient(this.attributes.Type as any, this.key,  {
          tableName: ns.get('tableName'),
          client: cache.getOrCreate('aws:dynamodb', () => new AWS.DynamoDB())
        }))
    };
  }
}

function keyType(shape: Shape) {
  if (Meta.get(shape).nullable === true) {
    throw new Error(`dynamodb Key must not be optional`);
  }
  if (ShapeGuards.isStringShape(shape) || ShapeGuards.isTimestampShape(shape)) {
    return dynamodb.AttributeType.STRING;
  } else if (ShapeGuards.isBinaryShape(shape)) {
    return dynamodb.AttributeType.STRING;
  } else if (ShapeGuards.isNumericShape(shape)) {
    return dynamodb.AttributeType.NUMBER;
  }
  throw new Error(`shape of kind ${shape.Kind} can not be used as a DynamoDB Key`);
}

export namespace Table {
  /**
   * A DynamoDB Table with read-only permissions.
   *
   * Unavailable methods: `put`, `putBatch`, `delete`, `update`.
   */
  export interface ReadOnly<A extends Attributes, K extends DynamoDBClient.Key<InstanceType<A>>> extends Omit<DynamoDBClient<A, K>, 'put' | 'putBatch' | 'delete' | 'update'> {}

  /**
   * A DynamoDB Table with write-only permissions.
   *
   * Unavailable methods: `batchGet`, `get`, `scan`, `query`
   */
  export interface WriteOnly<A extends Attributes, K extends DynamoDBClient.Key<InstanceType<A>>> extends Omit<DynamoDBClient<A, K>, 'batchGet' | 'get' | 'scan' | 'query'> {}

  /**
   * A DynamODB Table with read and write permissions.
   */
  export interface ReadWrite<A extends Attributes, K extends DynamoDBClient.Key<InstanceType<A>>> extends DynamoDBClient<A, K> {}
}
