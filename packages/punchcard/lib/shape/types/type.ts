import { DynamoPath } from '../../storage/dynamodb';
import { JsonPath } from '../json/path';
import { Kind } from './kind';

export interface Type<V> {
  kind: Kind;
  validate(value: V): void;
  toJsonPath(parent: JsonPath<any>, name: string): JsonPath<V>;
  toDynamoPath(parent: DynamoPath, name: string): DynamoPath;
  toJsonSchema(): {[key: string]: any};
  toGlueType(): {
    inputString: string;
    isPrimitive: boolean;
  };
  hashCode(value: V): number;
  equals(a: V, b: V): boolean;
}
