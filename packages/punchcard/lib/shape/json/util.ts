import { Shape } from '../shape';
import { StructFields, StructPath, StructShape } from '../struct';

export function jsonPath<S extends Shape>(shape: S): StructFields<S> {
  return new StructPath(null as any, '$', new StructShape(shape)).fields;
}