import { BaseDynamoPath, DSL, DynamoPath, MapKeyParent } from '../dynamodb/expression/path';
import { hashCode } from './hash';
import { ClassType } from './instance';
import { InferJsonPathType, JsonPath } from './json/path';
import { Kind } from './kind';
import { OptionalShape } from './optional';
import { RuntimeShape, Shape } from './shape';

export function struct<T>(fields: ClassType<T>): StructShape<T> {
  return new StructShape(fields.prototype);
}

export type Fields = {
  [field: string]: Shape<any>;
};

type OptionalKeys<T> =
  Pick<T, { [K in keyof T]: T[K] extends OptionalShape<any> ? K : never; }[keyof T]>;

type MandatoryKeys<T> =
  Pick<T, { [K in keyof T]: T[K] extends OptionalShape<any> ? never : K; }[keyof T]>;

type StructType<T> =
  { [K in keyof MandatoryKeys<T>]-?: RuntimeShape<T[K]>; } &
  { [K in keyof OptionalKeys<T>]+?: RuntimeShape<T[K]>; };

export class StructShape<T> implements Shape<StructType<T>> {
  public static isStruct(s: Shape<any>): s is StructShape<any> {
    return s.kind === Kind.Struct;
  }

  public readonly kind: Kind.Struct = Kind.Struct;

  constructor(public readonly fields: T) {}

  public validate(value: StructType<T>): void {
    Object.keys(this.fields).forEach(field => {
      const item = (value as any)[field];
      const schema = (this.fields as any)[field];

      if (item === undefined && !( schema as OptionalShape<any>).isOptional) {
        throw new Error(`required field ${field} is mising from object`);
      } else {
        schema.validate(item);
      }
    });
  }

  public toDynamoPath(parent: DynamoPath, name: string): StructDynamoPath<this> {
    return new StructDynamoPath(parent, name, this);
  }

  public toJsonPath(parent: JsonPath<any>, name: string): StructPath<this> {
    return new StructPath(parent, name, this);
  }

  public toJsonSchema(): object {
    const properties: any = {};
    const required: string[] = [];
    Object.keys(this.fields).forEach(field => {
      if (!((this.fields as any)[field]).isOptional) {
        required.push(field);
      }
      properties[field] = (this.fields as any)[field].toJsonSchema();
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
      inputString: `struct<${Object.keys(this.fields).map(name => {
        const field = (this.fields as any)[name];
        return `${name}:${field.toGlueType().inputString}`;
      }).join(',')}>`,
      isPrimitive: false
    };
  }

  public equals(a: StructType<T>, b: StructType<T>): boolean {
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
      if (!(this.fields as any)[aKey].equals(aValue, bValue)) {
        return false;
      }
    }
    return true;
  }

  public hashCode(value: StructType<T>): number {
    const prime = 31;
    let result = 1;
    Object.keys(value).forEach(key => {
      result += prime * result + hashCode(key);
      result += prime * result + (this.fields as any)[key].hashCode((value as any)[key]);
    });
    return result;
  }
}

export type StructFields<S extends StructShape<any>> = {
  [K in keyof S['fields']]: InferJsonPathType<S['fields'][K]>;
};

export class StructPath<S extends StructShape<any>> extends JsonPath<S> {
  public readonly fields: StructFields<S>;

  constructor(parent: JsonPath<any>, name: string, type: S) {
    super(parent, name, type);
    this.fields = {} as StructFields<S>;

    Object.keys(type.fields).forEach(field => {
      (this.fields as any)[field as keyof S] = type.fields[field].toJsonPath(this, `['${field}']`) as InferJsonPathType<S['fields'][typeof field]>;
    });
  }
}

/**
 * Path to a struct attribute (represented as a Map internally).
 *
 * Recursively creates an attribute for each key in the schema and assigns it to 'fields'.
 */
export class StructDynamoPath<S extends StructShape<any>> extends BaseDynamoPath<S> {
  public readonly fields: DSL<S['fields']> = {} as DSL<S['fields']>;

  constructor(parent: DynamoPath, name: string, shape: S) {
    super(parent, name, shape);
    for (const [key, schema] of Object.entries(shape.fields)) {
      (this.fields as any)[key as keyof S] = (schema as any).toDynamoPath(new MapKeyParent(this, key), key) as any;
    }
  }
}
