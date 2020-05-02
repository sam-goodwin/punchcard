import { ShapeGuards } from './guards';
import { nothing, NothingShape } from './primitive';
import { Shape } from './shape';
import { union, UnionShape } from './union';

export function isOptional<T extends Shape>(shape: T): boolean {
  if (ShapeGuards.isUnionShape(shape)) {
    return shape.Items.find(isOptional) !== undefined;
  }
  return ShapeGuards.isNothingShape(shape);
}

export type IsOptional<T extends Shape> =
  T extends UnionShape<infer T> ?
    NothingShape extends Extract<T[Extract<keyof T, number>], NothingShape> ? true :
    false :
  false
;
export type Optional<T extends Shape> = UnionShape<[T, NothingShape] & { length: 2; }>;

export function optional<T extends Shape>(shape: T): Optional<T> {
  return union(shape, nothing);
}

