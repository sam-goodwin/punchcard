import { ClassShape } from "./class";
import { ArrayShape, MapShape, SetShape } from "./collection";
import { BoolShape, NumberShape, StringShape, TimestampShape } from "./primitive";

export interface Visitor<T = unknown> {
  arrayShape(shape: ArrayShape<any>): T;
  boolShape(shape: BoolShape): T;
  classShape(shape: ClassShape<any>): T;
  mapShape(shape: MapShape<any>): T;
  numberShape(shape: NumberShape): T;
  setShape(shape: SetShape<any>): T;
  stringShape(shape: StringShape): T;
  timestampShape(shape: TimestampShape): T;
}
