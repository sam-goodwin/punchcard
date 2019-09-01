import { StructFields, StructPath, StructShape } from '../struct';

export function jsonPath<S extends StructShape<any>>(shape: S): StructFields<S> {
  return new StructPath(null as any, '$', shape).fields;
}