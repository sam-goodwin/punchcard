import { ArrayShape, BinaryShape, BoolShape, DynamicShape, LiteralShape, MapShape, NothingShape, NumericShape, RequiredKeys, SetShape, Shape, StringShape, TimestampShape, UnionShape } from '@punchcard/shape';
import { RecordMembers, RecordShape} from '@punchcard/shape/lib/record';

// tslint:disable: ban-types

export namespace AttributeValue {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-dynamodb.AttributeValue.Tag');

  export type Type =
    | AttributeValue.Binary
    | AttributeValue.BinarySet
    | AttributeValue.Bool
    | AttributeValue.List<any>
    | AttributeValue.Map<any>
    | AttributeValue.NothingValue
    | AttributeValue.NumberSet
    | AttributeValue.NumberValue
    | AttributeValue.StringSet
    | AttributeValue.StringValue
    | AttributeValue.Struct<any>
    ;

  export type Of<T extends Shape> =
    T extends StringShape | TimestampShape ? StringValue :
    T extends NumericShape ? NumberValue :
    T extends BoolShape ? Bool :
    T extends BinaryShape ? Binary :
    T extends NothingShape ? NothingValue :
    T extends DynamicShape<any> ? AttributeValue.Type :
    T extends ArrayShape<infer I> ? List<I> :
    T extends MapShape<infer V> ? Map<V> :
    T extends SetShape<infer I> ?
      I extends BinaryShape ? AttributeValue.BinarySet :
      I extends StringShape ? AttributeValue.StringSet :
      I extends NumericShape ? AttributeValue.NumberSet :
      never
      :
    T extends RecordShape<infer M> ? Struct<M> :
    T extends UnionShape<infer I> ? {
      [i in Extract<keyof I, number>]: Of<I[i]>
    }[Extract<keyof I, number>] :
    T extends LiteralShape<infer I> ? {
      [i in keyof I]: Of<I>
    }[keyof I] :
    T extends { [Tag]: infer T2 } ? T2 :
    never
    ;

  export interface Binary {
    B: Buffer;
  }
  export interface BinarySet {
    BS: Buffer[];
  }
  export interface Bool {
    BOOL: boolean;
  }
  export interface List<T extends Shape> {
    L: Of<T>[];
  }
  export interface Map<T extends Shape> {
    M: {
      [key: string]: Of<T> | undefined;
    };
  }
  export interface Struct<T extends RecordMembers> {
    M: {
      [m in keyof RecordMembers.Natural<T>]: AttributeValue.Of<RecordMembers.Natural<T>[m]>;
    }
  }
  export interface NumberValue {
    N: string;
  }
  export interface NothingValue {
    NULL: true;
  }
  export interface NumberSet {
    NS: string[];
  }
  export interface StringValue {
    S: string;
  }
  export interface StringSet {
    SS: string[];
  }
}
