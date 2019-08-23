import { DynamoPath } from '../../storage/dynamodb/expression/path';
import { JsonPath } from '../json/path';
import { Kind } from './kind';
import { Type } from './type';

export abstract class PrimitiveType<V> implements Type<V> {
  constructor(public readonly kind: Kind) {}

  public toJsonPath(parent: JsonPath<any>, name: string): JsonPath<V> {
    return new JsonPath(parent, name, this);
  }

  public equals(a: V, b: V): boolean {
    return a === b;
  }

  public abstract toDynamoPath(parent: DynamoPath, name: string): DynamoPath;
  public abstract toJsonSchema(): { [key: string]: any; };
  public abstract toGlueType(): {
    inputString: string;
    isPrimitive: boolean;
  };
  public abstract validate(value: V): void;
  public abstract isInstance(a: any): a is V;
  public abstract hashCode(value: V): number;
}
