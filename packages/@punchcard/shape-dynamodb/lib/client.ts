import AWS = require('aws-sdk');

import { AssertIsKey, ClassModel, ClassType, Shape } from "@punchcard/shape";
import { Runtime } from "@punchcard/shape-runtime";
import { DSL } from "./dsl";
import { Filter } from './filter';
import { Mapper } from './mapper';

export class Table<T extends ClassType, K extends Table.Key<ClassModel<T>>> {
  private readonly dsl: DSL.OfType<T>["fields"];
  public readonly client: AWS.DynamoDB;
  public readonly tableArn: string;
  public readonly mapper: Mapper<Shape.Of<T>>;
  public readonly keyMapper: (key: Table.KeyValue<T, K>) => any;

  constructor(public readonly type: T, public readonly key: K, config: Table.Props)  {
    const shape = Shape.of(type);
    this.dsl = DSL.of(type);
    this.client = config.client || new AWS.DynamoDB();
    this.tableArn = config.tableArn;
    this.mapper = Mapper.of(type);
    if (typeof key === 'string') {
      const hashKeyMapper = Mapper.of(type.prototype[key]);
      this.keyMapper = k => ({
        [key]: hashKeyMapper.write(k)
      });
    } else {
      const hk = (key as any)[0];
      const sk = (key as any)[1];
      const hashKeyMapper = Mapper.of(shape.Members[hk].Type);
      const sortKeyMapper = Mapper.of(shape.Members[sk].Type);

      this.keyMapper = (k: any) => ({
        [hk]: hashKeyMapper.write(k[0]),
        [sk]: sortKeyMapper.write(k[1])
      });
    }
  }

  public async get(key: Table.KeyValue<T, K>): Promise<Runtime.OfType<T> | undefined> {
    const result = await this.client.getItem({
      TableName: this.tableArn,
      Key: this.keyMapper(key)
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

  public async putIf(item: Runtime.OfType<T>, condition: (item: DSL.OfType<T>['fields']) => DSL.Bool) {
    return await this.client.putItem({
      TableName: this.tableArn,
      Item: this.mapper.write(item).M,
      ...(Filter.compile(condition(this.dsl)))
    }).promise();
  }

  public async query(condition: Table.QueryCondition<T, K>) {
    // todo
  }
}
export namespace Table {
  export interface Props {
    tableArn: string;
    client?: AWS.DynamoDB;
  }

  export type HashKey<T> = keyof T;
  export type SortKey<T> = [keyof T, keyof T];
  export type Key<T extends ClassType> = HashKey<ClassModel<T>> | SortKey<ClassModel<T>>;

  export type KeyValue<T extends ClassType, K extends Key<T>> = K extends [infer H, infer S] ?
    [
      Runtime.Of<ClassModel<T>[AssertIsKey<ClassModel<T>, H>]>,
      Runtime.Of<ClassModel<T>[AssertIsKey<ClassModel<T>, S>]>
    ] :
    Runtime.Of<ClassModel<T>[AssertIsKey<ClassModel<T>, K>]>
    ;

  export type HashKeyValue<T extends ClassType, K extends Key<T>> = K extends [infer H, any] ?
    Runtime.Of<ClassModel<T>[AssertIsKey<ClassModel<T>, H>]> :
    never
    ;

  export type SortKeyValue<T extends ClassType, K extends Key<T>> = Runtime.Of<SortKeyShape<T, K>>;

  export type SortKeyShape<T extends ClassType, K extends Key<T>> = K extends [any, infer S] ?
    ClassModel<T>[AssertIsKey<ClassModel<T>, S>] :
    never
    ;

  export type QueryCondition<T extends ClassType, K extends Key<T>> =
    K extends [infer HK, infer SK] ?
      HashKeyValue<T, K> | [HashKeyValue<T, K>, (i: DSL.Of<SortKeyShape<T, K>>) => DSL.Bool] :
    never
    ;

}
