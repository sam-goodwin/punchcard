import {ArrayShape, MapShape, SetShape} from "./collection";
import {
  BinaryShape,
  BoolShape,
  DynamicShape,
  IntegerShape,
  NothingShape,
  NumberShape,
  StringShape,
  TimestampShape,
} from "./primitive";
import {RecordShape} from "./record";

export interface ShapeVisitor<T = unknown, C = undefined> {
  arrayShape(shape: ArrayShape<any>, context: C): T;
  binaryShape(shape: BinaryShape, context: C): T;
  boolShape(shape: BoolShape, context: C): T;
  recordShape(shape: RecordShape<any>, context: C): T;
  dynamicShape(shape: DynamicShape<any>, context: C): T;
  integerShape(shape: IntegerShape, context: C): T;
  mapShape(shape: MapShape<any>, context: C): T;
  nothingShape(shape: NothingShape, context: C): T;
  numberShape(shape: NumberShape, context: C): T;
  setShape(shape: SetShape<any>, context: C): T;
  stringShape(shape: StringShape, context: C): T;
  timestampShape(shape: TimestampShape, context: C): T;
}
export namespace Visitor {
  export type YieldType<V extends ShapeVisitor> = V extends ShapeVisitor<
    infer T,
    any
  >
    ? T
    : never;
  export type ContextType<V extends ShapeVisitor> = V extends ShapeVisitor<
    any,
    infer C
  >
    ? C
    : null;
}
