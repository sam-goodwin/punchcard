import { ArrayShape, MapShape, SetShape } from './collection';
import { FunctionShape } from './function';
import { HashSet } from './hash-set';
import { Decorated } from './metadata';
import { AnyShape, BinaryShape, BoolShape, NothingShape, NumericShape, StringShape, TimestampShape, UnknownShape } from './primitive';
import { RecordMembers, RecordShape} from './record';
import { IsOptional } from './traits';

export namespace Value {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-runtime.Value.Tag');

  export type Of<T> = T extends { [Decorated.Data]: IsOptional; } ? undefined | _Of<T> : _Of<T>;

  export type _Of<T> =
    // use the instance type if this type can be constructed (for class A extends Record({}) {})
    T extends (new (...args: any[]) => infer I) ? I :
    // support overriding the type of a value
    T extends AnyShape ? any :
    T extends BinaryShape ? Buffer :
    T extends BoolShape ? boolean :
    T extends NothingShape ? undefined | null | void :
    T extends NumericShape ? number :
    T extends StringShape ? string :
    T extends TimestampShape ? Date :
    T extends UnknownShape ? unknown :

    T extends ArrayShape<infer I> ? Of<I>[] :
    T extends MapShape<infer V> ? { [key: string]: Of<V>; } :
    T extends SetShape<infer I> ? I extends StringShape | NumericShape | BoolShape ? Set<Of<I>> : HashSet<Of<I>> :
    T extends FunctionShape<infer Args, infer Returns> ? (args: {
      [argName in keyof Args]: Value.Of<Args[argName]>;
    }) => Value.Of<Returns> :

    // adhoc mapping
    T extends { [Value.Tag]: infer V } ? V :
    never
    ;
}

export namespace Structure {
  export type Of<T> = T extends { [Decorated.Data]: IsOptional; } ? undefined | _Of<T> : _Of<T>;

  type _Of<T> =
    // use the instance type if this type can be constructed (for class A extends Record({}) {})
    T extends RecordShape ? {
      [m in keyof RecordMembers.Natural<T['Members']>]: Of<RecordMembers.Natural<T['Members']>[m]>;
    } :
    Value.Of<T>
  ;
}
