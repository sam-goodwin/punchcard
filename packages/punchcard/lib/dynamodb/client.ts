
import AWS = require('aws-sdk');

import { RuntimeShape, Shape } from '../shape/shape';
import { StructShape } from '../shape/struct';
import { CompiledExpression } from './expression/compile-context';
import { CompileContextImpl } from './expression/compiler';
import { ActionType, Condition, DSL, UpdateAction } from './expression/path';
import { Key } from './key';
import { compileQuery, KeyConditionExpression } from './query';
import { Attributes, Table } from './table';

export class Client<PKey extends keyof A, SKey extends keyof A | undefined, A extends Attributes> {
  constructor(
    public readonly table: Table<PKey, SKey, A>,
    public readonly tableName: string,
    public readonly client: AWS.DynamoDB) {}

  public async get(key: RuntimeShape<StructShape<Key<A, PKey, SKey>>>): Promise<RuntimeShape<StructShape<A>> | undefined> {
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
  public async batchGet(keys: Array<RuntimeShape<StructShape<Key<A, PKey, SKey>>>>): Promise<Array<RuntimeShape<StructShape<A>> | undefined>> {
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
  public async scan(): Promise<Array<RuntimeShape<StructShape<A>>>> {
    const result = await this.client.scan({
      TableName: this.tableName
    }).promise();
    if (result.Items) {
      return result.Items.map(item => this.table.mapper.read(item));
    } else {
      return [];
    }
  }

  public put(put: PutRequest<A>): Promise<AWS.DynamoDB.PutItemOutput> {
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
  public async putBatch(batch: Array<RuntimeShape<StructShape<A>>>): Promise<AWS.DynamoDB.WriteRequest[]> {
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

  public async update(update: Update<A, RuntimeShape<StructShape<Key<A, PKey, SKey>>>>): Promise<AWS.DynamoDB.UpdateItemOutput> {
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

  public async query(query: Query<A, PKey, SKey>): Promise<Array<RuntimeShape<StructShape<A>>>> {
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

export interface PutRequest<A extends Attributes> {
  item: RuntimeShape<StructShape<A>>;
  if?: (facade: DSL<A>) => Condition;
}

export interface Update<A extends Attributes, K> {
  key: K;
  actions: (item: DSL<A>) => UpdateAction[];
  if?: (item: DSL<A>) => Condition;
}

export type Query<A extends Attributes, P extends keyof A, S extends keyof A | undefined> =
  S extends keyof A ? {
    key: KeyConditionExpression<A, P, S>;
    filter?: (item: DSL<A>) => Condition;
  } : never;
