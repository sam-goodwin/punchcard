import { ClassShape } from "./class";
import { ArrayShape, MapShape, SetShape } from "./collection";
import { NumberShape, StringShape } from "./primitive";

export interface Visitor<T = unknown> {
  stringShape(shape: StringShape): T;
  numberShape(shape: NumberShape): T;

  arrayShape(shape: ArrayShape<any>): T;
  setShape(shape: SetShape<any>): T;
  mapShape(shape: MapShape<any>): T;

  classShape(shape: ClassShape<any>): T;
}
