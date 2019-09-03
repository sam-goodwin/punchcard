import { DynamoPath, InferDynamoPathType } from '../dynamodb/expression/path';
import { InferJsonPathType, JsonPath } from './json/path';
import { Kind } from './kind';
import { RuntimeShape, Shape } from './shape';

export function optional<T extends Shape<any>>(type: T): OptionalShape<T> {
  return new OptionalShape(type);
}

export class OptionalShape<T extends Shape<any>> implements Shape<RuntimeShape<T> | undefined> {
  public readonly kind: Kind = Kind.Optional;
  public readonly isOptional: boolean = true;

  constructor(public readonly type: T) {}

  public validate(_value: RuntimeShape<T> | undefined): void {
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

  public hashCode(value: RuntimeShape<T>): number {
    if (value === undefined) {
      return 0;
    }
    return this.type.hashCode(value);
  }

  public equals(a: RuntimeShape<T> | undefined, b: RuntimeShape<T> | undefined): boolean {
    if (a === undefined && b === undefined) {
      return true;
    } else if (a === undefined || b === undefined) {
      return false;
    } else {
      return this.type.equals(a, b);
    }
  }
}
