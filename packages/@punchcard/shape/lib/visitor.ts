import { ArrayShape, MapShape, SetShape } from './collection';
import { FunctionArgs, FunctionShape } from './function';
import { BinaryShape, BoolShape, DynamicShape, IntegerShape, NothingShape, NumberShape, StringShape, TimestampShape } from './primitive';
import { RecordMembers, RecordShape } from './record';
import type { Shape } from './shape';

export interface ShapeVisitor<T = unknown, C = undefined> {
  arrayShape(shape: ArrayShape<Shape>, context: C): T;
  binaryShape(shape: BinaryShape, context: C): T;
  boolShape(shape: BoolShape, context: C): T;
  recordShape(shape: RecordShape<RecordMembers>, context: C): T;
  dynamicShape(shape: DynamicShape<any>, context: C): T;
  functionShape(shape: FunctionShape<FunctionArgs, Shape>): T;
  integerShape(shape: IntegerShape, context: C): T;
  mapShape(shape: MapShape<Shape>, context: C): T;
  nothingShape(shape: NothingShape, context: C): T;
  numberShape(shape: NumberShape, context: C): T;
  setShape(shape: SetShape<Shape>, context: C): T;
  stringShape(shape: StringShape, context: C): T;
  timestampShape(shape: TimestampShape, context: C): T;
}
export namespace Visitor {
  export type YieldType<V extends ShapeVisitor> = V extends ShapeVisitor<infer T, any>  ? T : never;
  export type ContextType<V extends ShapeVisitor> = V extends ShapeVisitor<any, infer C>  ? C : null;
}