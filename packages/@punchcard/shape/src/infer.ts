import { ArrayShape, MapShape, SetShape } from "./collection";
import { BinaryShape, boolean, BoolShape, IntegerShape, nothing, number, NumberShape, string, StringShape, timestamp, TimestampShape } from "./primitive";
import { Shape } from "./shape";


declare module './shape' {
  namespace Shape {
    export function infer<V>(value: V): Infer<V>;

    export type Infer<T> =
      T extends boolean ? BoolShape :
      T extends Buffer ? BinaryShape :
      T extends Date ? TimestampShape :
      T extends number ? NumberShape :
      T extends string ? StringShape :
      T extends bigint ? IntegerShape :
      T extends (infer I)[] ? ArrayShape<Infer<I>> :
      T extends Map<string, infer V> ? MapShape<Infer<V>> :
      T extends Set<infer I> ? SetShape<Infer<I>> :
      T extends object ? {
        Members: {
          [m in keyof T]: Infer<T[m]>;
        }
      } & Shape :
      never
      ;
  }
}
Shape.infer = (value: any): any => {
  if (typeof value === 'string') {
    return string;
  } else if (typeof value === 'boolean') {
    return boolean;
  } else if (typeof value === 'number') {
    return number;
  } else if (typeof value === 'undefined') {
    return nothing;
  } else if (value instanceof Date) {
    return timestamp;
  }
  throw new Error(`cannot infer shape for: ${value}`);
};