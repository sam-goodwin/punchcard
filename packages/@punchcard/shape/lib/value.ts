import { ArrayShape, MapShape, SetShape } from './collection';
import { HashSet } from './hash-set';
import { BinaryShape, BoolShape, NumericShape, StringShape, TimestampShape } from './primitive';

export namespace Value {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-runtime.Value.Tag');

  export type Of<T> =
    // use the instance type if this type can be constructed (for class A extends Record({}) {})
    T extends (new (...args: any[]) => infer I) ? I :
    // support overriding the type of a value
    T extends StringShape ? string :
    T extends NumericShape ? number :
    T extends BoolShape ? boolean :
    T extends BinaryShape ? Buffer :
    T extends TimestampShape ? Date :
    T extends ArrayShape<infer I> ? Of<I>[] :
    T extends MapShape<infer V> ? { [key: string]: Of<V>; } :
    T extends SetShape<infer I> ? I extends StringShape | NumericShape | BoolShape ?
      Set<Of<I>> :
      HashSet<Of<I>> :
    T extends { [Value.Tag]: infer V } ? V :
    never
    ;

    // /**
    //  * Use the Tagged value if it exists (usually for a Shape)
    //  */
    // T; extends {[Tag];: infer; T2;} ? T2 :
    // /**
    //  * Otherwise use the instance value (usually for a Record)
    //  */
    // T; extends new(v;: any;) => infer; T2 ? T2 :

    // never;
}
