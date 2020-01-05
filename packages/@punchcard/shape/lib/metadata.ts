import { Shape } from './shape';

import 'reflect-metadata';

/**
 * Metadata extracted from a Class of a Class Member.
 */
export type Metadata = {
  [key in string | symbol]: any;
};

// tslint:disable: ban-types
export function getClassMetadata(target: Object): Metadata {
  return Reflect.getMetadataKeys(target)
    .map(k => ({ [k]: Reflect.getMetadata(k, target) }))
    .reduce((a, b) => ({...a, ...b}), {});
}

export function getPropertyMetadata(target: Object, key: string | symbol): Metadata {
  return Reflect.getMetadataKeys(target, key)
    .map(k => ({ [k]: Reflect.getMetadata(k, target, key) }))
    .reduce((a, b) => ({...a, ...b}), {});
}

export namespace Meta {
  export function get(target: any, keys?: string[]): Metadata | undefined {
    const meta = target[Decorated.Data] || {};

    if (keys) {
      return keys
        .filter(k => meta[k] !== undefined)
        .map(k => ({[k]: meta[k]}))
        .reduce((a, b) => ({...a, ...b}), {});
    }
    return target[Decorated.Data];
  }

  export function apply<Target extends Object, T extends Trait<Target, M>, M extends Metadata>(shape: Target, metadata: T): Apply<T, M> {
    metadata = {
      ...((shape as any)[Decorated.Data] || {}),
      ...metadata // overwrite previous values
    };
    // is this a really bad idea?
    const wrapper = new Proxy(shape, {
      get: (obj: any, prop) => {
        if (prop === Decorated.Data) {
          return metadata;
        } else {
          return obj[prop];
        }
      }
    });
    return wrapper as any;
  }

  export type GetType<T> = T extends Decorated<infer T2, any> ? T2 : T;
  export type GetData<T, OrElse = {}> = T extends Decorated<any, infer D> ? D : OrElse;
  export type GetDataOrElse<T, OrElse> = GetData<T, OrElse>;
}

/**
 * Apply metadata to a Type.
 */
export type Apply<T, D> =
  T extends Decorated<infer T2, infer D2> ?
    T2 & Decorated<T2, D & D2> : // if we're applying to something with metadata, then augment the original type (T2), not T.
    T & Decorated<T, D> // first application, so safe to augment T
    ;

/**
 * Tags to maintain decorated type information.
 *
 * @typeparam T - type of decorated value, e.g. a `StringShape`.
 * @typeparam D - type of data applied to the type, `T`.
 */
export interface Decorated<T, D> {
  [Decorated.Type]?: T;
  [Decorated.Data]?: D
}
export namespace Decorated {
  export const Data = Symbol.for('@punchcard/shape.Decorated.Data');
  export const Type = Symbol.for('@punchcard/shape.Decorated.Type');
}

/**
 * A Trait is a value that can decorate a type with metadata.
 *
 * @typeparam Target - type of allowed targets (e.g. StringShape)
 * @typeparam Data - type of metadata to apply to the target
 */
export interface Trait<T, D> {
  [Trait.Target]?: T;
  [Trait.Data]?: D
}
export namespace Trait {
  export const Data = Symbol.for('@punchcard/shape.Trait.Data');
  export const Target = Symbol.for('@punchcard/shape.Trait.Target');

  export type GetTarget<T extends Trait<any, any>> = T extends Trait<infer T2, any> ? T2 : never;
  export type GetData<T extends Trait<any, any>> = T extends Trait<any, infer D> ? D : never;
}