import { DynamoPath } from '../../storage/dynamodb';
import { JsonPath } from '../json/path';
import { Kind } from './kind';
import { RuntimeType } from '../shape';

export interface Type<V> {
  kind: Kind;
  /**
   * TODO: improve return type for better error tracing
   */
  validate(value: V): void;
  toJsonPath(parent: JsonPath<any>, name: string): JsonPath<V>;
  toDynamoPath(parent: DynamoPath, name: string): DynamoPath;
  toJsonSchema(): {[key: string]: any};
  toGlueType(): {
    inputString: string;
    isPrimitive: boolean;
  };
  isInstance(a: any): a is V;
  isType(a: Type<any>): a is this;
  hashCode(value: V): number;
  equals(a: V, b: V): boolean;
}

export namespace Type {
  export const tag = Symbol.for('punchcard:type');

}
export interface Class<T extends Type<any>> {
  readonly [Type.tag]: {
    type: T;
  };

  newInstance: (value: RuntimeType<T>) => Object<this>;
}
export namespace Class {
  export const tag = Symbol.for('punchcard:class');

  export function isClass(a: any): a is Class<Type<any>, any> {
    return a[Type.tag] !== undefined;
  }
}

export class Object<C extends Class<any>> {
  public static isObject(a: any): a is Object<Class<any, any>> {
    return a[Class.tag] !== undefined;
  }

  public readonly [Class.tag]: C;

  constructor(clazz: C) {
    this[Class.tag] = clazz;
  }
}

export namespace Object {
  export class Instance<C extends Class<any, any>> extends Object<C> {

  }
}
