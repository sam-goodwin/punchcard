import { BaseDynamoPath, DynamoPath, Facade, MapKeyParent } from '../dynamodb/expression/path';
import { hashCode } from './hash';
import { InferJsonPathType, JsonPath } from './json/path';
import { Kind } from './kind';
import { OptionalType } from './optional';
import { RuntimeShape, Shape } from './shape';
import { Type } from './type';

export function struct<S extends Shape>(schema: S): StructType<S> {
  return new StructType(schema);
}

export class StructType<S extends Shape> implements Type<RuntimeShape<S>> {
  public readonly kind: Kind.Struct = Kind.Struct;

  constructor(public readonly shape: S) {}

  public validate(value: RuntimeShape<S>): void {
    Object.keys(this.shape).forEach(field => {
      const item = (value as any)[field];
      const schema = this.shape[field];

      if (item === undefined && !( schema as OptionalType<any>).isOptional) {
        throw new Error(`required field ${field} is mising from object`);
      } else {
        schema.validate(item);
      }
    });
  }

  public toDynamoPath(parent: DynamoPath, name: string): StructDynamoPath<S> {
    return new StructDynamoPath(parent, name, this);
  }

  public toJsonPath(parent: JsonPath<any>, name: string): StructPath<S> {
    return new StructPath(parent, name, this);
  }

  public toJsonSchema(): object {
    const properties: any = {};
    const required: string[] = [];
    Object.keys(this.shape).forEach(field => {
      if (!( this.shape[field] as any).isOptional) {
        required.push(field);
      }
      properties[field] = this.shape[field].toJsonSchema();
    });

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      additionalProperties: false
    };
  }

  public toGlueType() {
    return {
      inputString: `struct<${Object.keys(this.shape).map(name => {
        const field = this.shape[name];
        return `${name}:${field.toGlueType().inputString}`;
      }).join(',')}>`,
      isPrimitive: false
    };
  }

  public equals(a: RuntimeShape<S>, b: RuntimeShape<S>): boolean {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    for (const aKey of aKeys) {
      const aValue = (a as any)[aKey];
      const bValue = (b as any)[aKey];
      if (bValue === undefined) {
        return false;
      }
      if (!this.shape[aKey].equals(aValue, bValue)) {
        return false;
      }
    }
    return true;
  }

  public hashCode(value: RuntimeShape<S>): number {
    const prime = 31;
    let result = 1;
    Object.keys(value).forEach(key => {
      result += prime * result + hashCode(key);
      result += prime * result + this.shape[key].hashCode((value as any)[key]);
    });
    return result;
  }
}

export type StructFields<S extends Shape> = {
  [K in keyof S]: InferJsonPathType<S[K]>;
};

export class StructPath<S extends Shape> extends JsonPath<RuntimeShape<S>> {
  public readonly fields: StructFields<S>;

  constructor(parent: JsonPath<any>, name: string, type: StructType<S>) {
    super(parent, name, type);
    this.fields = {} as StructFields<S>;

    Object.keys(type.shape).forEach(field => {
      this.fields[field as keyof S] = type.shape[field].toJsonPath(this, `['${field}']`) as InferJsonPathType<S[typeof field]>;
    });
  }
}

/**
 * Path to a struct attribute (represented as a Map internally).
 *
 * Recursively creates an attribute for each key in the schema and assigns it to 'fields'.
 */
export class StructDynamoPath<S extends Shape> extends BaseDynamoPath<StructType<S>> {
  public readonly fields: Facade<S> = {} as Facade<S>;

  constructor(parent: DynamoPath, name: string, type: StructType<S>) {
    super(parent, name, type);
    for (const [key, schema] of Object.entries(type.shape)) {
      this.fields[key as keyof S] = schema.toDynamoPath(new MapKeyParent(this, key), key) as any;
    }
  }
}
