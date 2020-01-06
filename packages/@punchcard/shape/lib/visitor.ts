import { ClassShape } from "./class";
import { ArrayShape, MapShape, SetShape } from "./collection";
import { BoolShape, NumberShape, StringShape, TimestampShape } from "./primitive";

export interface Visitor<T = unknown, C = undefined> {
  arrayShape(shape: ArrayShape<any>, context: C): T;
  boolShape(shape: BoolShape, context: C): T;
  classShape(shape: ClassShape<any>, context: C): T;
  mapShape(shape: MapShape<any>, context: C): T;
  numberShape(shape: NumberShape, context: C): T;
  setShape(shape: SetShape<any>, context: C): T;
  stringShape(shape: StringShape, context: C): T;
  timestampShape(shape: TimestampShape, context: C): T;
}
export namespace Visitor {
  export type YieldType<V extends Visitor> = V extends Visitor<infer T, any>  ? T : never;
  export type ContextType<V extends Visitor> = V extends Visitor<any, infer C>  ? C : never;
}