import { RuntimeShape, Shape } from "./shape";

// tslint:disable: variable-name

export type ClassType<T> = new(...args: any[]) => T;

export const Type = Symbol.for('punchcard:instance.typeTag');

export type Value<T> = Structure<T> & {
  [Type]: T
};

export type Structure<T> = {
  [prop in keyof T]:
    T[prop] extends Shape ? RuntimeShape<T[prop]> :
    T[prop] extends ClassType<infer V> ? Value<V> :
    never;
};

export namespace Value {
  export function factory<T>(valueTypeClass: ClassType<T>): (value: Structure<T>) => Value<T> {
    return (value: Structure<T>) => Value.of(valueTypeClass, value) as any;
  }

  export function of<T>(valueTypeClass: ClassType<T>, value: Structure<T>): Value<T> {
    return {
      [Type]: valueTypeClass.prototype,
      ...value
    };
  }

  export type TypeOf<V extends Value<any>> = V extends Value<infer T> ? T : never;
  export function typeOf<V extends Value<any>>(instance: V): V extends Value<infer T> ? T : never {
    return instance[Type];
  }
}
