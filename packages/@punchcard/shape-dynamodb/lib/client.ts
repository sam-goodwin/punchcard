import AWS = require('aws-sdk');

import { AssertIsKey, Pointer, RecordShape, Shape, Value } from '@punchcard/shape';
import { Compact } from 'typelevel-ts';
import { DSL } from './dsl';
import { Condition } from './filter';
import { Mapper } from './mapper';
import { Update } from './update';
import { Writer } from './writer';

export interface BaseClientProps<T extends RecordShape<any>, K extends DDB.KeyOf<T>> {
  /**
   * Record typr of the table's properties.
   */
  data: T;
  /**
   * Key of the Table.
   */
  key: K;
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

export class BaseClient<T extends RecordShape<any>, K extends DDB.KeyOf<T>> {
  public readonly client: AWS.DynamoDB;
  public readonly mapper: Mapper<T>;
  public readonly tableName: string;
  public readonly indexName?: string;

  public readonly hashKeyMapper: Mapper<DDB.HashKeyShape<T, K>>;
  public readonly sortKeyMapper: Mapper<DDB.SortKeyShape<T, K>>;
  public readonly readKey: (key: AWS.DynamoDB.Key) => DDB.KeyValue<T, K>;
  public readonly writeKey: (key: DDB.KeyValue<T, K>) => any;

  protected readonly dsl: DSL.Root<T>;

  public readonly type: Pointer<T>;
  public readonly key: K;

  constructor(config: BaseClientProps<T, K>)  {
    this.type = config.data;
    this.key = config.key;
    this.dsl = DSL.of(this.type);
    this.client = config.client || new AWS.DynamoDB();
    this.tableName = config.tableName;
    this.indexName = config.indexName;
    this.mapper = Mapper.of(this.type);

    if (typeof this.key.sort === 'undefined') {
      const hashKeyMapper = Mapper.of(this.type.Members[this.key.partition]);
      this.writeKey = (k: any) => ({
        [this.key.partition]: hashKeyMapper.write(k[this.key.partition])
      });
      this.readKey = (k: any) => ({
        [this.key.partition]: hashKeyMapper.read(k[this.key.partition])
      }) as any;
    } else {
      const hk = this.key.partition;
      const sk = this.key.sort;
      const hashKeyMapper = Mapper.of(this.type.Members[hk]);
      const sortKeyMapper = Mapper.of(this.type.Members[sk]);
      this.writeKey = (k: any) => ({
        [hk]: hashKeyMapper.write(k[hk]),
        [sk]: sortKeyMapper.write(k[sk])
      });
      this.readKey = (k: any) => ({
        [hk]: hashKeyMapper.read(k[hk]),
        [sk]: sortKeyMapper.read(k[sk])
      }) as any;
    }
  }

  // TODO: Support paging, etc.
  public async scan(): Promise<Value.Of<T>[]> {
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

    let queryCondition = (this.dsl as any)[this.key.partition].equals(condition[this.key.partition]);
    if ((condition as any)[this.key.sort] !== undefined) {
      queryCondition = queryCondition.and((condition as any)[this.key.sort]((this.dsl as any)[this.key.sort]));
    }
    queryCondition[DSL.Synthesize](queryWriter);

    const queryExpr = queryWriter.toExpression();

    const req: AWS.DynamoDB.QueryInput = {
      TableName: this.tableName,
      KeyConditionExpression: queryExpr.Expression,
      FilterExpression: filterExpr?.Expression,
      ExpressionAttributeNames: queryExpr?.ExpressionAttributeNames,
      ExpressionAttributeValues: queryExpr?.ExpressionAttributeValues,
      ExclusiveStartKey: props.ExclusiveStartKey === undefined ? undefined : this.writeKey(props.ExclusiveStartKey),
      ScanIndexForward: props.ScanIndexForward
    };
    if (req.ScanIndexForward === undefined) {
      delete req.ScanIndexForward;
    }
    if (req.FilterExpression === undefined) {
      delete req.FilterExpression;
    }
    if (req.ExclusiveStartKey === undefined) {
      delete req.ExclusiveStartKey;
    }
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

export interface TableClientProps<T extends RecordShape<any>, K extends DDB.KeyOf<T>> extends Omit<BaseClientProps<T, K>, 'indexName'> {}

export class TableClient<T extends RecordShape<any>, K extends DDB.KeyOf<T>> extends BaseClient<T, K> {
  constructor(config: TableClientProps<T, K>)  {
    super(config);
  }

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
  public async batchGet(keys: DDB.KeyValue<T, K>[]): Promise<Value.Of<T>[]> {
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
  public async batchPut(batch: Value.Of<T>[]): Promise<AWS.DynamoDB.WriteRequest[]> {
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
      ...(Update.compile(props.actions(this.dsl), writer)),
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

export interface IndexClientProps<T extends RecordShape<any>, K extends DDB.KeyOf<T>> extends TableClientProps<T, K> {
  /**
   * Name of the DynamoDB Index.
   * Required for the IndexClient.
   */
  indexName: string;
}

/**
 * Client to Query and Scan a DynamoDB Index.
 */
export class IndexClient<T extends RecordShape<any>, K extends DDB.KeyOf<T>> extends BaseClient<T, K> {
  constructor(config: IndexClientProps<T, K>) {
    super(config);
  }
}

export namespace DDB {
  type _QueryOutput<T extends RecordShape<any>, K extends KeyOf<T>> = Compact<
    Omit<AWS.DynamoDB.QueryOutput, 'Items' | 'LastEvaulatedKey'> & {
      Items?: Value.Of<T>[];
      LastEvaluatedKey?: KeyValue<T, K>
    }>;
  export interface QueryOutput<T extends RecordShape<any>, K extends KeyOf<T>> extends _QueryOutput<T, K> {}

  export type HashKey<T> = keyof T;
  export type SortKey<T> = [keyof T, keyof T];
  export interface KeyOf<T extends RecordShape<any>> {
    partition: keyof T['Members'];
    sort?: keyof T['Members'] | undefined;
  }

  export type KeyNames<T extends RecordShape<any>, K extends KeyOf<T>> =
    K extends { partition: infer PK, sort?: undefined } ? PK :
    K extends { partition: infer PK, sort: infer SK } ? PK | SK :
    never;

  export type KeyValue<T extends RecordShape<any>, K extends KeyOf<T>> = {
    [k in KeyNames<T, K>]: Value.Of<T['Members'][AssertIsKey<T['Members'], k>]>;
  };

  export type HashKeyName<K> = K extends { partition: infer H; } ? H : never;

  export type HashKeyValue<T extends RecordShape<any>, K extends KeyOf<T>> = Value.Of<HashKeyShape<T, K>>;
  export type HashKeyShape<T extends RecordShape<any>, K extends KeyOf<T>> = T['Members'][AssertIsKey<T['Members'], HashKeyName<K>>];

  export type SortKeyName<K> = K extends { sort?: infer S; } ? S : undefined;

  export type SortKeyValue<T extends RecordShape<any>, K extends KeyOf<T>> = Value.Of<SortKeyShape<T, K>>;
  export type SortKeyShape<T extends RecordShape<any>, K extends KeyOf<T>> = T['Members'][AssertIsKey<T['Members'], SortKeyName<K>>];

  export type QueryCondition<T extends RecordShape<any>, K extends KeyOf<T>> =
    SortKeyName<K> extends undefined ? {
      [k in HashKeyName<K>]: HashKeyValue<T, K>;
    } : {
      [k in HashKeyName<K>]: HashKeyValue<T, K>;
    } & {
      [k in SortKeyName<K>]?: (i: DSL.Of<SortKeyShape<T, K>>) => DSL.Bool
    }
    ;
  export interface QueryProps<T extends RecordShape<any>, K extends KeyOf<T>> {
    filter?: DDB.Condition<T>;

    Limit?: number;
    ExclusiveStartKey?: DDB.KeyValue<T, K>;
    ContinuationToken?: string;
    ScanIndexForward?: boolean;
  }

  export type Condition<T extends RecordShape<any>> = (item: DSL.Root<T>) => DSL.Bool;
  export interface Update<T extends RecordShape<any>> {
    actions: (item: DSL.Root<T>) => DSL.Action[];
    if?: DDB.Condition<T>;
  }
}
