import { ClassShape } from "./class";
import { NumberShape, StringShape } from "./primitive";

export interface Visitor<T = unknown> {
  stringShape(shape: StringShape): T;
  numberShape(shape: NumberShape): T;

  classShape(shape: ClassShape<any>): T;
}
