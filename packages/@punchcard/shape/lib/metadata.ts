import { Shape } from './shape';

/**
 * Metadata extracted from a Class of a Class Member.
 */
export interface ModelMetadata {
  [key: string]: any;
}

// tslint:disable: ban-types
export function getClassMetadata(target: Object): ModelMetadata {
  return Reflect.getMetadataKeys(target)
    .map(k => ({ [k]: Reflect.getMetadata(k, target) }))
    .reduce((a, b) => ({...a, ...b}), {});
}

export function getPropertyMetadata(target: Object, key: string | symbol): ModelMetadata {
  return Reflect.getMetadataKeys(target, key)
    .map(k => ({ [k]: Reflect.getMetadata(k, target, key) }))
    .reduce((a, b) => ({...a, ...b}), {});
}

export function decorate<T extends Shape, M extends ModelMetadata>(shape: T, metadata: M): Decorated<T, M> {
  metadata = {
    ...((shape as any)[MetadataTag] || {}),
    ...metadata
  };
  // is this a really bad idea?
  const wrapper = new Proxy(shape, {
    get: (obj: any, prop) => {
      if (prop === MetadataTag) {
        return metadata;
      } else {
        return obj[prop];
      }
    }
  });
  return wrapper as any;
}

export const Annotation = Symbol.for('@punchcard/shape.Annotation');
export type Annotation<Target, M> = M & {
  [Annotation]?: Target;
};

export const MetadataTag = Symbol.for('@punchcard/shape.MetadataTag');
export type Decorated<T extends Shape, M extends ModelMetadata> = T & {
  [MetadataTag]: M;
};