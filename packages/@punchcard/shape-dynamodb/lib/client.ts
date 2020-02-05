import AWS = require('aws-sdk');

import { AssertIsKey, RecordShape, RecordType, Shape, Value } from '@punchcard/shape';
import { Compact } from 'typelevel-ts';
import { DSL } from './dsl';
import { Condition } from './filter';
import { Mapper } from './mapper';
import { Update } from './update';
import { Writer } from './writer';

export interface TableClientProps {
  /**
   * DynamoDB Table Name.
   */
  tableName: string;
  /**
   * Name of the DynamoDB Index.
   *
   * @default - no index
   */
  indexName?: string;
  /**
   * Configured AWS DynamoDB Client.
   *
   * @default - one using the default environment configuration is created for you.
   */
  client?: AWS.DynamoDB;
}

export class BaseClient<T extends RecordType, K extends DDB.KeyOf<T>> {
  public readonly client: AWS.DynamoDB;
  public readonly mapper: Mapper<T>;
  public readonly tableName: string;
  public readonly indexName?: string;

  public readonly hashKeyName: DDB.HashKeyName<T, K>;
  public readonly sortKeyName: DDB.HashKeyName<T, K>;

  public readonly hashKeyMapper: Mapper<DDB.HashKeyShape<T, K>>;
  public readonly sortKeyMapper: Mapper<DDB.SortKeyShape<T, K>>;
  public readonly readKey: (key: AWS.DynamoDB.Key) => DDB.KeyValue<T, K>;
  public readonly writeKey: (key: DDB.KeyValue<T, K>) => any;

  protected readonly dsl: DSL.Root<T>;

  constructor(public readonly type: T, public readonly key: K, config: TableClientProps)  {
    const shape = Shape.of(type);
    this.dsl = DSL.of(type);
    this.client = config.client || new AWS.DynamoDB();
    this.tableName = config.tableName;
    this.indexName = config.indexName;
    this.mapper = Mapper.of(type);

    if (typeof key === 'string') {
      const hashKeyMapper = Mapper.of(shape.Members[key].Shape);
      this.writeKey = k => ({
        [key]: hashKeyMapper.write(k)
      });
      this.readKey = (k: any) => ({
        [key]: hashKeyMapper.read(k[key])
      }) as any;
    } else {
      const hk = (key as any)[0];
      const sk = (key as any)[1];
      const hashKeyMapper = Mapper.of(shape.Members[hk].Shape);
      const sortKeyMapper = Mapper.of(shape.Members[sk].Shape);
      this.writeKey = (k: any) => ({
          [hk]: hashKeyMapper.write(k[0]),
          [sk]: sortKeyMapper.write(k[1])
        });
      this.readKey = (k: AWS.DynamoDB.Key) => ({
        [hk]: hashKeyMapper.read(k[hk]),
        [sk]: sortKeyMapper.read(k[sk])
      }) as any;
    }
  }

  // TODO: Support paging, etc.
  public async scan(): Promise<Array<Value.Of<T>>> {
    const request: AWS.DynamoDB.ScanInput = {
      TableName: this.tableName,
    };
    if (this.indexName) {
      request.IndexName = this.indexName;
    }
    const result = await this.client.scan(request).promise();
    if (result.Items) {
      return result.Items.map(item => this.mapper.read({ M: item } as any));
    } else {
      return [];
    }
  }

  public async query(condition: DDB.QueryCondition<T, K>, props: DDB.QueryProps<T, K> = {}): Promise<DDB.QueryOutput<T, K>> {
    const namespace = new Writer.Namespace();
    const queryWriter = new Writer(namespace);

    let filterExpr;
    if (props.filter) {
      const filterWriter = new Writer(namespace);

      props.filter(this.dsl)[DSL.Synthesize](filterWriter);
      filterExpr = filterWriter.toExpression();
    }

    if (Array.isArray(condition)) {
      const hashKeyValue = this.hashKeyMapper.write(condition[0]!);

      const hashKeyCond = (this.dsl as any)[this.hashKeyName].equals(hashKeyValue);
      const sortKeyCond = condition[1] as DSL.Bool;

      queryWriter.writeNode(hashKeyCond.and(sortKeyCond));
    } else {
      const hashKeyValue = this.hashKeyMapper.write(condition as any);
      const hashKeyCond = (this.dsl as any)[this.hashKeyName].equals(hashKeyValue);

      queryWriter.writeNode(hashKeyCond as any);
    }

    const queryExpr = queryWriter.toExpression();

    const req: AWS.DynamoDB.QueryInput = {
      TableName: this.tableName,
      KeyConditionExpression: queryExpr.Expression,
      FilterExpression: filterExpr?.Expression,
      ExpressionAttributeNames: queryExpr?.ExpressionAttributeNames,
      ExpressionAttributeValues: queryExpr?.ExpressionAttributeValues,
      ExclusiveStartKey: props.exclusiveStartKey === undefined ? undefined : this.writeKey(props.exclusiveStartKey)
    };
    if (this.indexName) {
      req.IndexName = this.indexName;
    }
    if (!req.ExpressionAttributeNames) {
      delete req.ExpressionAttributeNames;
    }
    if (!req.ExpressionAttributeValues) {
      delete req.ExpressionAttributeValues;
    }
    const result = await this.client.query(req).promise();

    return {
      ...result,
      Items: result.Items?.map(v => this.mapper.read({M : v} as any)),
      LastEvaluatedKey: result.LastEvaluatedKey === undefined ? undefined : this.readKey(result.LastEvaluatedKey) as any
    };
  }
}

export class TableClient<T extends RecordType, K extends DDB.KeyOf<T>> extends BaseClient<T, K> {
  public async get(key: DDB.KeyValue<T, K>): Promise<Value.Of<T> | undefined> {
    const req: AWS.DynamoDB.GetItemInput = {
      TableName: this.tableName,
      Key: this.writeKey(key)
    };
    const result = await this.client.getItem(req).promise();

    if (result.Item !== undefined) {
      return this.mapper.read({M: result.Item} as any);
    } else {
      return undefined;
    }
  }

  // TODO: retry behavior/more options/etc.
  public async batchGet(keys: Array<DDB.KeyValue<T, K>>): Promise<Array<Value.Of<T>>> {
    const result = await this.client.batchGetItem({
      RequestItems: {
        [this.tableName]: {
          Keys: keys.map(key => this.writeKey(key)),
        }
      }
    }).promise();

    if (result.Responses) {
      const items = result.Responses[this.tableName];
      if (items) {
        return items.map(item => this.mapper.read({ M: item.Item } as any));
      }
    }
    throw new Error('TODO');
  }

  public async put(item: Value.Of<T>, props: {
    if?: DDB.Condition<T>;
  } = {}) {
    if (props.if) {
      const expr = Condition.compile(props.if(this.dsl));
      return await this.client.putItem({
        TableName: this.tableName,
        Item: (this.mapper.write(item) as any).M,
        ConditionExpression: expr.Expression,
        ExpressionAttributeNames: expr.ExpressionAttributeNames,
        ExpressionAttributeValues: expr.ExpressionAttributeValues
      }).promise();
    } else {
      return await this.client.putItem({
        TableName: this.tableName,
        Item:  (this.mapper.write(item) as any).M,
      }).promise();
    }
  }

  /**
   * Put a batch of records
   *
   * @param batch
   * @returns failed PutRequests
   */
  public async batchPut(batch: Array<Value.Of<T>>): Promise<AWS.DynamoDB.WriteRequest[]> {
    try {
      const result = await this.client.batchWriteItem({
        RequestItems: {
          [this.tableName]: batch.map(record => {
            return {
              PutRequest: {
                Item: (this.mapper.write(record) as any).M
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
      console.error('putBatch error', error);
      throw error;
    }
  }

  public async update(key: DDB.KeyValue<T, K>, props: DDB.Update<T>) {
    const writer = new Writer();
    const req: AWS.DynamoDB.UpdateItemInput = {
      TableName: this.tableName,
      Key: this.writeKey(key),
      ...(Update.compile(props.actions(this.dsl), writer))
    };
    if (props.if) {
      const expr = Condition.compile(props.if(this.dsl), new Writer(writer.namespace));
      req.ConditionExpression = expr.Expression;
      req.ExpressionAttributeNames = expr.ExpressionAttributeNames;
      req.ExpressionAttributeValues = expr.ExpressionAttributeValues;
      if (!req.ExpressionAttributeNames) {
        delete req.ExpressionAttributeNames;
      }
      if (!req.ExpressionAttributeValues) {
        delete req.ExpressionAttributeValues;
      }
    }
    const response = await this.client.updateItem(req).promise();
    return response;
  }
}

export interface IndexClientProps extends TableClientProps {
  /**
   * Name of the DynamoDB Index.
   * Required for the IndexClient.
   */
  indexName: string;
}

/**
 * Client to Query and Scan a DynamoDB Index.
 */
export class IndexClient<T extends RecordType, K extends DDB.KeyOf<T>> extends BaseClient<T, K> {
  constructor(type: T, key: K, config: IndexClientProps) {
    super(type, key, config);
  }
}

export namespace DDB {
  type _QueryOutput<T extends RecordType, K extends KeyOf<T>> = Compact<
    Omit<AWS.DynamoDB.QueryOutput, 'Items' | 'LastEvaulatedKey'> & {
      Items?: Array<Value.Of<T>>;
      LastEvaluatedKey?: KeyValue<T, K>
    }>;
  export interface QueryOutput<T extends RecordType, K extends KeyOf<T>> extends _QueryOutput<T, K> {}

  export type HashKey<T> = keyof T;
  export type SortKey<T> = [keyof T, keyof T];
  export type KeyOf<T extends RecordType> = HashKey<T[RecordShape.Members]> | SortKey<T[RecordShape.Members]>;

  export type KeyValue<T extends RecordType, K extends KeyOf<T>> = K extends [infer H, infer S] ?
    [
      Value.Of<T[RecordShape.Members][AssertIsKey<T[RecordShape.Members], H>]>,
      Value.Of<T[RecordShape.Members][AssertIsKey<T[RecordShape.Members], S>]>
    ] :
    Value.Of<T[RecordShape.Members][AssertIsKey<T[RecordShape.Members], K>]>
    ;

  export type HashKeyName<T extends RecordType, K extends KeyOf<T>> = K extends [infer H, any] ? H : T;
  export type HashKeyValue<T extends RecordType, K extends KeyOf<T>> = Value.Of<HashKeyShape<T, K>>;
  export type HashKeyShape<T extends RecordType, K extends KeyOf<T>> = K extends [infer H, any] ?
    T[RecordShape.Members][AssertIsKey<T[RecordShape.Members], H>] :
    never
    ;

  export type SortKeyName<T extends RecordType, K extends KeyOf<T>> = K extends [any, infer S] ? S : T;
  export type SortKeyValue<T extends RecordType, K extends KeyOf<T>> = Value.Of<SortKeyShape<T, K>>;
  export type SortKeyShape<T extends RecordType, K extends KeyOf<T>> = K extends [any, infer S] ?
    T[RecordShape.Members][AssertIsKey<T[RecordShape.Members], S>] :
    never
    ;

  export type QueryCondition<T extends RecordType, K extends KeyOf<T>> =
    K extends [infer HK, infer SK] ?
      HashKeyValue<T, K> | [HashKeyValue<T, K>, (i: DSL.Of<SortKeyShape<T, K>>) => DSL.Bool] :
    never
    ;
  export interface QueryProps<T extends RecordType, K extends KeyOf<T>> {
    exclusiveStartKey?: DDB.KeyValue<T, K>;
    filter?: DDB.Condition<T>;
  }

  export type Condition<T extends RecordType> = (item: DSL.Root<T>) => DSL.Bool;
  export interface Update<T extends RecordType> {
    actions: (item: DSL.Root<T>) => DSL.StatementNode[];
    if?: DDB.Condition<T>;
  }
}
