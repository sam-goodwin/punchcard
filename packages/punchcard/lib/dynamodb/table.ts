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
// import { Mapper, RuntimeShape, Shape, struct } from "../shape";
import { Omit } from '../util/omit';
import { CompiledExpression } from './expression/compile-context';
import { CompileContextImpl } from './expression/compiler';
import { ActionType, Condition, Facade, toFacade, UpdateAction } from './expression/path';
import { Key, keyType } from './key';
import * as Dynamo from './mapper';
import { compileQuery, KeyConditionExpression } from './query';

export type TableProps<S extends Shape, PKey extends keyof S, SKey extends keyof S | undefined> = {
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
export class Table<S extends Shape, PKey extends keyof S, SKey extends keyof S | undefined>
    extends dynamodb.Table
    implements Dependency<Table.Client<S, PKey, SKey>> {
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

  constructor(scope: core.Construct, id: string, props: TableProps<S, PKey, SKey>) {
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
  public async bootstrap(namespace: Namespace, cache: Cache): Promise<Table.Client<S, PKey, SKey>> {
    return new Table.Client(this,
      namespace.get('tableName'),
      cache.getOrCreate('aws:dynamodb', () => new AWS.DynamoDB())) as Table.Client<S, PKey, SKey>;
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

  private _install(grant: (grantable: iam.IGrantable) => void): Dependency<Table.Client<S, PKey, SKey>> {
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
  public readAccess(): Dependency<Table.Client<S, PKey, SKey>> {
    return this._install(this.grantReadData.bind(this));
  }

  /**
   * Take a *read-write* dependency on this table.
   */
  public readWriteAccess(): Dependency<Table.Client<S, PKey, SKey>> {
    return this._install(this.grantReadWriteData.bind(this));
  }

  /**
   * Take a *write-only* dependency on this table.
   */
  public writeAccess(): Dependency<Table.Client<S, PKey, SKey>> {
    return this._install(this.grantWriteData.bind(this));
  }

  /**
   * Take a *full-access* dependency on this table.
   */
  public fullAccess(): Dependency<Table.Client<S, PKey, SKey>> {
    return this._install(this.grantFullAccess.bind(this));
  }
}

export namespace Table {
  export class Client<S extends Shape, PKey extends keyof S, SKey extends keyof S | undefined> {
    constructor(
      public readonly table: Table<S, PKey, SKey>,
      public readonly tableName: string,
      public readonly client: AWS.DynamoDB) {}

    public async get(key: RuntimeShape<Key<S, PKey, SKey>>): Promise<RuntimeShape<S> | undefined> {
      const result = await this.client.getItem({
        TableName: this.tableName,
        Key: this.table.keyMapper.write(key)
      }).promise();

      if (result.Item) {
        return this.table.mapper.read(result.Item);
      } else {
        return undefined;
      }
    }

    // TODO: retry behavior/more options/etc.
    public async batchGet(keys: Array<RuntimeShape<Key<S, PKey, SKey>>>): Promise<Array<RuntimeShape<S> | undefined>> {
      const result = await this.client.batchGetItem({
        RequestItems: {
          [this.tableName]: {
            Keys: keys.map(key => this.table.keyMapper.write(key)),
          }
        }
      }).promise();

      if (result.Responses) {
        const items = result.Responses[this.tableName];
        if (items) {
          return items.map(item => this.table.mapper.read(item.Item as AWS.DynamoDB.AttributeMap));
        }
      }
      throw new Error('TODO');
    }

    // TODO: Support paging, etc.
    public async scan(): Promise<Array<RuntimeShape<S>>> {
      const result = await this.client.scan({
        TableName: this.tableName
      }).promise();
      if (result.Items) {
        return result.Items.map(item => this.table.mapper.read(item));
      } else {
        return [];
      }
    }

    public put(put: PutRequest<S>): Promise<AWS.DynamoDB.PutItemOutput> {
      let expression: Partial<CompiledExpression> = {};
      if (put.if) {
        expression = put.if(this.table.facade).render(new CompileContextImpl());
      }

      return this.client.putItem({
        TableName: this.tableName,
        Item: this.table.mapper.write(put.item),
        ...expression
      }).promise();
    }

    /**
     * Put a batch of records
     *
     * @param batch
     * @returns failed PutRequests
     */
    public async putBatch(batch: Array<RuntimeShape<S>>): Promise<AWS.DynamoDB.WriteRequest[]> {
      try {
        const result = await this.client.batchWriteItem({
          RequestItems: {
            [this.tableName]: batch.map(record => {
              return {
                PutRequest: {
                  Item: this.table.mapper.write(record)
                }
              };
            })
          }
        }).promise();

        if (!result.UnprocessedItems) {
          return [];
        } else {
          return result.UnprocessedItems[this.tableName];
        }
      } catch (error) {
        console.log('putBatch error', error);
        throw error;
      }
    }

    public async update(update: Update<S, RuntimeShape<Key<S, PKey, SKey>>>): Promise<AWS.DynamoDB.UpdateItemOutput> {
      const actions = update.actions(this.table.facade);
      if (actions.length === 0) {
        throw new Error('must perform at least one update action');
      }

      const context = new CompileContextImpl();
      const adds: string[] = [];
      const deletes: string[] = [];
      const removes: string[] = [];
      const sets: string[] = [];

      actions.forEach(action => {
        const expression = action.compile(context);
        switch (action.type) {
          case ActionType.ADD:
            adds.push(expression); break;
          case ActionType.DELETE:
            deletes.push(expression); break;
          case ActionType.REMOVE:
            removes.push(expression); break;
          case ActionType.SET:
            sets.push(expression); break;
          default:
            throw new Error(`unknown action type: ${action.type}`);
        }
      });
  // tslint:disable: variable-name
      let UpdateExpression: string = '';
      if (adds.length > 0) { UpdateExpression += `ADD ${adds.join(',')} `; }
      if (deletes.length > 0) { UpdateExpression += `DELETE ${deletes.join(',')} `; }
      if (removes.length > 0) { UpdateExpression += `REMOVE ${removes.join(',')} `; }
      if (sets.length > 0) { UpdateExpression += `SET ${sets.join(',')} `; }

      let ConditionExpression: string | undefined;
      if (update.if) {
        ConditionExpression = update.if(this.table.facade).compile(context);
      }

      const updateRequest = {
        TableName: this.tableName,
        Key: this.table.keyMapper.write(update.key),
        UpdateExpression,
        ConditionExpression,
        ExpressionAttributeNames: context.names,
        ExpressionAttributeValues: context.values
      };
      if (ConditionExpression === undefined) {
        delete updateRequest.ConditionExpression;
      }
      return await this.client.updateItem(updateRequest).promise();
    }

    public async query(query: Query<S, PKey, SKey>): Promise<Array<RuntimeShape<S>>> {
      const result = await this.client.query({
        TableName: this.tableName,
        ...compileQuery(this.table as any, query as any)
      }).promise();

      if (result.Items) {
        return result.Items.map(item => this.table.mapper.read(item));
      } else {
        return [];
      }
    }
  }
}

export interface PutRequest<T extends Shape> {
  item: RuntimeShape<T>;
  if?: (facade: Facade<T>) => Condition;
}

export interface Update<S extends Shape, K> {
  key: K;
  actions: (item: Facade<S>) => UpdateAction[];
  if?: (item: Facade<S>) => Condition;
}

export type Query<S extends Shape, PKey extends keyof S, SKey extends keyof S | undefined> =
  SKey extends keyof S ? {
  key: KeyConditionExpression<S, PKey, SKey>;
  filter?: (item: Facade<S>) => Condition;
} : never;
