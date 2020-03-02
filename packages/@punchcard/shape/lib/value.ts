import { ArrayShape, MapShape } from './collection';
import { AnyShape, bool, BoolShape, NothingShape, number, NumberShape, string, StringShape, TimestampShape } from './primitive';
import { StructShape } from './struct';

export namespace Value {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-runtime.Value.Tag');

  export type Of<T> =
    /**
     * Use the Tagged value if it exists (usually for a Shape)
     */
    T extends {[Tag]: infer T2} ? T2 :
    /**
     * Otherwise use the instance value (usually for a Record)
     */
    T extends new(v: any) => infer T2 ? T2 :

    never;

  export type InferShape<V> =
    V extends string ? StringShape :
    V extends number ? NumberShape :
    V extends boolean ? BoolShape :
    V extends (undefined | null | void) ? NothingShape :
    V extends Date ? TimestampShape :
    V extends Array<infer I> ? ArrayShape<I extends never ? AnyShape : InferShape<I>> :
    V extends Map<string, infer I> ? MapShape<InferShape<I>> :
    V extends { [key: string]: any; } ? InferredRecord<V> :
    AnyShape
    ;

  export interface InferredRecord<V extends { [key: string]: any }> extends StructShape<{
    [K in Extract<keyof V, string>]: InferShape<V[K]>;
  }> {}

  export function inferShape<V>(value: V): InferShape<V> {
    switch (typeof value) {
      case 'boolean': return bool as any;
      case 'string': return string as any;
      case 'number': return number as any;
      case 'object':
    }
    if (Array.isArray(value)) {

    }
  }
}
