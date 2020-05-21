import { ArrayShape, MapShape, SetShape } from './collection';
import { FunctionShape } from './function';
import { HashSet } from './hash-set';
import { LiteralShape } from './literal';
import { AnyShape, BinaryShape, BoolShape, NothingShape, NumberShape, StringShape, TimestampShape } from './primitive';
import { Fields, RecordShape} from './record';
import { UnionShape } from './union';

export namespace Value {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-runtime.Value.Tag');

  export type Of<T> =
    // use the instance type if this type can be constructed (for class A extends Record({}) {})
    T extends (new (...args: any[]) => infer I) ? I :
    // support overriding the type of a value
    T extends AnyShape ? any :
    T extends BinaryShape ? Buffer :
    T extends BoolShape ? boolean :
    T extends NothingShape ? undefined :
    T extends NumberShape ? number :
    T extends StringShape ? string :
    T extends TimestampShape ? Date :
    T extends LiteralShape<any, infer V> ? V :
    T extends UnionShape<infer U> ? {
      [u in keyof U]: Of<U[u]>
    }[Extract<keyof U, number>]:

    T extends ArrayShape<infer I> ? Of<I>[] :
    T extends MapShape<infer V> ? { [key: string]: Of<V>; } :
    T extends SetShape<infer I> ? I extends StringShape | NumberShape | BoolShape ? Set<Of<I>> : HashSet<Of<I>> :
    T extends FunctionShape<infer Args, infer Returns> ? (args: {
      [argName in keyof Args]: Value.Of<Args[argName]>;
    }) => Value.Of<Returns> :

    // adhoc mapping
    T extends { [Value.Tag]: infer V } ? V :
    never
    ;
}

export namespace Structure {
  export type Of<T> =
    // use the instance type if this type can be constructed (for class A extends Record({}) {})
    T extends RecordShape ? {
      [m in keyof Fields.Natural<T['Members']>]: Of<Fields.Natural<T['Members']>[m]>;
    } :
    Value.Of<T>
  ;
}
