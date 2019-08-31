import { Shape } from '../shape';
import { StructFields, StructPath, StructType } from '../struct';

export function jsonPath<S extends Shape>(shape: S): StructFields<S> {
  return new StructPath(null as any, '$', new StructType(shape)).fields;
}