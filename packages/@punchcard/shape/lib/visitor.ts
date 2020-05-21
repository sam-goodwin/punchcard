import { ArrayShape, MapShape, SetShape } from './collection';
import { FunctionArgs, FunctionShape } from './function';
import { LiteralShape } from './literal';
import { AnyShape, BinaryShape, BoolShape, NeverShape, NothingShape, NumberShape, StringShape, TimestampShape } from './primitive';
import { Fields, RecordShape } from './record';
import type { Shape } from './shape';
import { UnionShape } from './union';

export interface ShapeVisitor<T = unknown, C = undefined> {
  arrayShape(shape: ArrayShape<Shape>, context: C): T;
  binaryShape(shape: BinaryShape, context: C): T;
  boolShape(shape: BoolShape, context: C): T;
  recordShape(shape: RecordShape<Fields>, context: C): T;
  anyShape(shape: AnyShape, context: C): T;
  functionShape(shape: FunctionShape<FunctionArgs, Shape>): T;
  mapShape(shape: MapShape<Shape>, context: C): T;
  neverShape(shape: NeverShape, context: C): T;
  nothingShape(shape: NothingShape, context: C): T;
  numberShape(shape: NumberShape, context: C): T;
  setShape(shape: SetShape<Shape>, context: C): T;
  literalShape(shape: LiteralShape<Shape, any>, context: C): T;
  stringShape(shape: StringShape, context: C): T;
  timestampShape(shape: TimestampShape, context: C): T;
  unionShape(shape: UnionShape<Shape[]>, context: C): T;
}
export namespace Visitor {
  export type YieldType<V extends ShapeVisitor> = V extends ShapeVisitor<infer T, any>  ? T : never;
  export type ContextType<V extends ShapeVisitor> = V extends ShapeVisitor<any, infer C>  ? C : null;
}