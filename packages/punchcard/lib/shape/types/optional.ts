import { DynamoPath, InferDynamoPathType } from '../../storage/dynamodb/expression/path';
import { InferJsonPathType, JsonPath } from '../json/path';
import { Kind } from './kind';
import { Type } from './type';

export function optional<T extends Type<V>, V>(type: T): MakeOptional<T> {
  return new OptionalType(type) as any as MakeOptional<T>;
}

type MakeOptional<T extends Type<any>> = T extends Type<infer V> ? OptionalType<T, V> : never;

export class OptionalType<T extends Type<V>, V> implements Type<V | undefined> {
  public readonly kind: Kind = Kind.Optional;
  public readonly isOptional: boolean = true;

  constructor(public readonly type: T) {}

  public validate(_value: V | undefined): void {
    if (_value !== undefined && _value !== null) {
      this.type.validate(_value);
    }
  }

  public toDynamoPath(parent: DynamoPath, name: string): InferDynamoPathType<T> {
    return this.type.toDynamoPath(parent, name) as InferDynamoPathType<T>;
  }

  public toJsonPath(parent: JsonPath<any>, name: string): InferJsonPathType<T> {
    return this.type.toJsonPath(parent, name) as InferJsonPathType<T>;
  }

  public toJsonSchema() {
    const j = this.type.toJsonSchema();
    return {
      ...j,
      type: Array.isArray(j.type) ? ['null'].concat(...j.type) : ['null', j.type]
    };
  }

  public toGlueType() {
    return this.type.toGlueType();
  }

  public hashCode(value: V): number {
    if (value === undefined) {
      return 0;
    }
    return this.type.hashCode(value);
  }

  public equals(a: V | undefined, b: V | undefined): boolean {
    if (a === undefined && b === undefined) {
      return true;
    } else if (a === undefined || b === undefined) {
      return false;
    } else {
      return this.type.equals(a, b);
    }
  }
}
