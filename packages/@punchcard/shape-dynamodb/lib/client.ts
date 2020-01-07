import AWS = require('aws-sdk');

import { AssertIsKey, ClassType, Compact, Shape } from "@punchcard/shape";
import { Runtime } from "@punchcard/shape-runtime";
import { DSL } from "./dsl";
import { Condition } from './filter';
import { Mapper } from './mapper';
import { Update } from './update';
import { Writer } from './writer';

export class Table<T extends ClassType, K extends Table.Key<InstanceType<T>>> {
  private readonly dsl: DSL.OfType<T>["fields"];
  public readonly client: AWS.DynamoDB;
  public readonly tableArn: string;
  public readonly mapper: Mapper<Shape.Of<T>>;

  public readonly hashKeyName: Table.HashKeyName<T, K>;
  public readonly sortKeyName: Table.HashKeyName<T, K>;

  public readonly hashKeyMapper: Mapper<Table.HashKeyShape<T, K>>;
  public readonly sortKeyMapper: Mapper<Table.SortKeyShape<T, K>>;
  public readonly keyWriter: (key: Table.KeyValue<T, K>) => any;
  public readonly keyReader: (key: any) => Table.KeyValue<T, K>;

  constructor(public readonly type: T, public readonly key: K, config: Table.Props)  {
    const shape = Shape.of(type);
    this.dsl = DSL.of(type);
    this.client = config.client || new AWS.DynamoDB();
    this.tableArn = config.tableArn;
    this.mapper = Mapper.of(type);
    if (typeof key === 'string') {
      const hashKeyMapper = Mapper.of(type.prototype[key]);
      this.keyWriter = k => ({
        [key]: hashKeyMapper.write(k)
      });
      this.keyReader = k => ({
        [key]: hashKeyMapper.read(k)
      }) as any;
    } else {
      const hk = (key as any)[0];
      const sk = (key as any)[1];
      const hashKeyMapper = Mapper.of(shape.Members[hk].Type);
      const sortKeyMapper = Mapper.of(shape.Members[sk].Type);

      this.keyWriter = (k: any) => ({
        [hk]: hashKeyMapper.write(k[0]),
        [sk]: sortKeyMapper.write(k[1])
      });
      this.keyReader = k => ({
        [hk]: hashKeyMapper.read(k[0]),
        [sk]: sortKeyMapper.read(k[1])
      }) as any;
    }
  }

  public async get(key: Table.KeyValue<T, K>): Promise<Runtime.OfType<T> | undefined> {
    const result = await this.client.getItem({
      TableName: this.tableArn,
      Key: this.keyWriter(key)
    }).promise();

    if (result.Item) {
      return this.mapper.read({M: result.Item} as any);
    } else {
      return undefined;
    }
  }

  public async put(item: Runtime.OfType<T>) {
    return await this.client.putItem({
      TableName: this.tableArn,
      Item: this.mapper.write(item).M
    }).promise();
  }

  public async putIf(item: Runtime.OfType<T>, condition: Table.Condition<T>) {
    const expr = Condition.compile(condition(this.dsl));
    return await this.client.putItem({
      TableName: this.tableArn,
      Item: this.mapper.write(item).M,
      ConditionExpression: expr.Expression,
      ExpressionAttributeNames: expr.ExpressionAttributeNames,
      ExpressionAttributeValues: expr.ExpressionAttributeValues
    }).promise();
  }

  public async update(key: Table.KeyValue<T, K>, update: Table.Update<T>) {
    return await this.client.updateItem({
      TableName: this.tableArn,
      Key: this.keyWriter(key),
      ...(Update.compile(update(this.dsl)))
    }).promise();
  }

  public async query(condition: Table.QueryCondition<T, K>, props: {
    exclusiveStartKey?: Table.KeyValue<T, K>;
    filter?: Table.Condition<T>;
  } = {}): Promise<Table.QueryOutput<T, K>> {
    const namespace = new Writer.Namespace();
    const queryWriter = new Writer(namespace);

    let filterExpr;
    if (props.filter) {
      const filterWriter = new Writer(namespace);

      props.filter(this.dsl).synthesize(filterWriter);
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

    const result = await this.client.query({
      TableName: this.tableArn,
      KeyConditionExpression: queryExpr.Expression,
      FilterExpression: filterExpr?.Expression,
      ExpressionAttributeNames: queryExpr?.ExpressionAttributeNames,
      ExpressionAttributeValues: queryExpr?.ExpressionAttributeValues,
      ExclusiveStartKey: props.exclusiveStartKey === undefined ? undefined : this.keyWriter(props.exclusiveStartKey)
    }).promise();

    return {
      ...result,
      Items: result.Items?.map(v => this.mapper.read({M : v} as any)),
      LastEvaluatedKey: result.LastEvaluatedKey === undefined ? undefined : this.keyReader(result.LastEvaluatedKey) as any
    };
  }
}
export namespace Table {
  type _QueryOutput<T extends ClassType, K extends Key<T>> = Compact<
    Omit<AWS.DynamoDB.QueryOutput, 'Items' | 'LastEvaulatedKey'> & {
      Items?: Array<Runtime.OfType<T>>;
      LastEvaluatedKey?: KeyValue<T, K>
    }>;
  export interface QueryOutput<T extends ClassType, K extends Key<T>> extends _QueryOutput<T, K> {}

  export interface Props {
    tableArn: string;
    client?: AWS.DynamoDB;
  }

  export type HashKey<T> = keyof T;
  export type SortKey<T> = [keyof T, keyof T];
  export type Key<T extends ClassType> = HashKey<InstanceType<T>> | SortKey<InstanceType<T>>;

  export type KeyValue<T extends ClassType, K extends Key<T>> = K extends [infer H, infer S] ?
    [
      Runtime.Of<InstanceType<T>[AssertIsKey<InstanceType<T>, H>]>,
      Runtime.Of<InstanceType<T>[AssertIsKey<InstanceType<T>, S>]>
    ] :
    Runtime.Of<InstanceType<T>[AssertIsKey<InstanceType<T>, K>]>
    ;

  export type HashKeyName<T extends ClassType, K extends Key<T>> = K extends [infer H, any] ? H : T;
  export type HashKeyValue<T extends ClassType, K extends Key<T>> = Runtime.Of<HashKeyShape<T, K>>;
  export type HashKeyShape<T extends ClassType, K extends Key<T>> = K extends [infer H, any] ?
    InstanceType<T>[AssertIsKey<InstanceType<T>, H>] :
    never
    ;

  export type SortKeyName<T extends ClassType, K extends Key<T>> = K extends [any, infer S] ? S : T;
  export type SortKeyValue<T extends ClassType, K extends Key<T>> = Runtime.Of<SortKeyShape<T, K>>;
  export type SortKeyShape<T extends ClassType, K extends Key<T>> = K extends [any, infer S] ?
    InstanceType<T>[AssertIsKey<InstanceType<T>, S>] :
    never
    ;

  export type QueryCondition<T extends ClassType, K extends Key<T>> =
    K extends [infer HK, infer SK] ?
      HashKeyValue<T, K> | [HashKeyValue<T, K>, (i: DSL.Of<SortKeyShape<T, K>>) => DSL.Bool] :
    never
    ;

  export type Condition<T extends ClassType> = (item: DSL.OfType<T>['fields']) => DSL.Bool;
  export type Update<T extends ClassType> = (item: DSL.OfType<T>['fields']) => DSL.StatementNode[];

}
