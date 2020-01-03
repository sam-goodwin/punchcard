import { ClassType } from '../instance';
import { StructFields, StructPath, StructShape } from '../struct';

export function jsonPath<T>(shape: ClassType<T>): StructFields<StructShape<T>> {
  return new StructPath(null as any, '$', shape.prototype).fields;
}