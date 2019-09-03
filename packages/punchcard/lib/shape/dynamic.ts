import { DynamoPath, InferDynamoPathType } from '../dynamodb/expression/path';
import { TreeFields } from '../util/tree';
import { hashCode as strHashCode } from './hash';
import { InferJsonPathType, JsonPath } from './json/path';
import { Kind } from './kind';
import { Shape } from './shape';

/**
 * A dynamic value. Resolves to `any` or `unknown` at runtime.
 *
 * @see dynamic
 * @see unsafeDynamic
 */
export class DynamicShape<T extends any | unknown> implements Shape<T> {
  public readonly kind: Kind = Kind.Dynamic;

  public validate(value: unknown): void {
    // no op
  }

  public toJsonPath(parent: JsonPath<any>, name: string): JsonPath<this> {
    throw new Error('Method not implemented.');
  }

  public toDynamoPath(parent: DynamoPath, name: string): AnyDynamoPath {
    return new AnyDynamoPath(parent, name);
  }

  public toJsonSchema(): { [key: string]: any; } {
    return {};
  }

  public toGlueType(): { inputString: string; isPrimitive: boolean; } {
    throw new Error(`any is not supported with Glue`);
  }

  public hashCode(value: unknown): number {
    return hashCode(value);

    function hashCode(value: any): number {
      switch (typeof value) {
        case 'string': return strHashCode(value);
        case 'boolean': return value ? 1 : 0;
        case 'number': return value;
        case 'undefined': return 0;
        case 'object':
          if (Array.isArray(value)) {
            const prime = 31;
            let result = 1;
            value.forEach(item => result += prime * result + hashCode(item));
            return result;
          } else {
            const prime = 31;
            let result = 1;
            Object.keys(value).forEach(key => {
              result += prime * result + strHashCode(key);
              result += prime * result + hashCode(value[key]);
            });
            return result;
          }
        default:
          throw new Error(`unsupported value in any type: '${typeof value}'`);
      }
    }
  }
  public equals(a: T, b: T): boolean {
    return equals(a, b);

    function equals(a: any, b: any): boolean {
      const type = typeof a;
      if (type !== typeof b) {
        return false;
      }
      switch (type) {
        case 'undefined': return true;
        case 'string':
        case 'number':
        case 'bigint':
        case 'boolean':
          return a === b;
        case 'object':
          if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) {
              return false;
            }
            for (let i = 0; i < a.length; i++) {
              if (!equals(a[i], b[i])) {
                return false;
              }
            }
            return true;
          } else if (Array.isArray(a) || Array.isArray(b)) {
            return false;
          }
          const aKeys = Object.keys(a);
          const bKeys = new Set(Object.keys(b));
          if (aKeys.length !== bKeys.size) {
            return false;
          }
          for (const k of aKeys) {
            if (!bKeys.has(k)) {
              return false;
            }
            if (!equals(a[k], b[k])) {
              return false;
            }
          }
          return true;
        default:
          throw new Error(`unsupported value in any type: '${type}'`);
      }
    }
  }
}

/**
 * A safe dynamic value. Resolves to `unknown` at runtime.
 */
export const dynamic = new DynamicShape<unknown>();

/**
 * An un-safe dynamic value value. Resolves to `any` at runtime.
 */
export const unsafeDynamic = new DynamicShape<any>();

export class AnyDynamoPath extends DynamoPath {
  public as<T extends Shape<any>>(type: T): InferDynamoPathType<T> {
    return type.toDynamoPath(this[TreeFields.parent] as DynamoPath, this[TreeFields.name]) as InferDynamoPathType<T>;
  }
}

export class AnyJsonPath extends JsonPath<any> {
  public as<T extends Shape<any>>(type: T): InferJsonPathType<T> {
    return type.toJsonPath(this[TreeFields.parent] as JsonPath<any>, this[TreeFields.name]) as InferJsonPathType<T>;
  }
}
