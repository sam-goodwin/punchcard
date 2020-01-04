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