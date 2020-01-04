import { Shape } from './shape';

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
    const meta = target[Meta.Data] || {};

    if (keys) {
      return keys
        .filter(k => meta[k] !== undefined)
        .map(k => ({[k]: meta[k]}))
        .reduce((a, b) => ({...a, ...b}), {});
    }
    return target[Meta.Data];
  }

  export const Data = Symbol.for('@punchcard/shape.Metadata.Data');
  export const Target = Symbol.for('@punchcard/shape.Metadata.Target');

  export function apply<Target extends Object, T extends Trait<Target, M>, M extends Metadata>(shape: Target, metadata: T): Apply<T, M> {
    metadata = {
      ...((shape as any)[Data] || {}),
      ...metadata // overwrite previous values
    };
    // is this a really bad idea?
    const wrapper = new Proxy(shape, {
      get: (obj: any, prop) => {
        if (prop === Data) {
          return metadata;
        } else {
          return obj[prop];
        }
      }
    });
    return wrapper as any;
  }

  export type Apply<T, D> = T & {
    [Meta.Data]?: D; // & GetOrElse<T, {}>;
  };

  export type Get<T, OrElse = {}> =
    T extends { [Meta.Data]?: infer D; } ?
      D extends never | undefined ?
        OrElse :
        D :
    OrElse
    ;

  export type GetOrElse<T, OrElse> = Get<T, OrElse>;
  export type GetAs<T, U, OrElse = {}> = Get<T> extends U ? Get<T> : OrElse;
}

export interface Trait<Target, Data> {
  [Meta.Target]?: Target;
  [Meta.Data]?: Data
};

export namespace Trait {
  export type GetTarget<T extends Trait<any, any>> = T extends Trait<infer T, any> ? T : never;
  export type GetData<T extends Trait<any, any>> = T extends Trait<any, infer D> ? D : never;
}