import { ArrayShape, BinaryShape, BoolShape, MapShape, NumericShape, RequiredKeys, Shape, StringShape, TimestampShape, SetShape } from '@punchcard/shape';
import { RecordMembers, RecordShape, RecordType, ShapeOrRecord } from '@punchcard/shape/lib/record';
import { StructShape } from '@punchcard/shape/lib/struct';

declare module '@punchcard/shape/lib/shape' {
  export interface Shape {
    [AttributeValue.Tag]: AttributeValue.Type;
  }
}

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

  export function shapeOf<T extends ShapeOrRecord>(type: T): AttributeValue.ShapeOf<T> {

  }
  /**
   * Map a ShapeOrRecord to its DynamoDB shape.
   */
  export type ShapeOf<T extends ShapeOrRecord> =
    T extends BinaryShape ? StructShape<{B: StringShape}> :
    T extends BoolShape ? StructShape<{BOOL: BoolShape}> :
    T extends NumericShape ? StructShape<{N: StringShape}> :
    T extends StringShape | TimestampShape ? StructShape<{S: StringShape}> :
    T extends StructShape<infer M> ? StructShape<{
      M: StructShape<{
        [m in keyof M]: AttributeValue.ShapeOf<M[m]>;
      }>
    }> :
    T extends RecordShape<infer M> ? StructShape<{
      M: StructShape<{
        [m in keyof M]: AttributeValue.ShapeOf<M[m]>;
      }>
    }> :
    T extends RecordType<any, infer M> ? StructShape<{
      M: StructShape<{
        [m in keyof M]: AttributeValue.ShapeOf<M[m]>;
      }>
    }> :
    T extends ArrayShape<infer I> ? StructShape<{
      L: ArrayShape<AttributeValue.ShapeOf<I>>;
    }> :
    T extends MapShape<infer V> ? StructShape<{
      M: MapShape<AttributeValue.ShapeOf<V>>;
    }> :
    T extends SetShape<infer I> ?
      I extends BinaryShape ? StructShape<{
        BS: ArrayShape<StringShape>;
      }> :
      I extends StringShape ? StructShape<{
        SS: ArrayShape<StringShape>;
      }> :
      I extends NumericShape ? StructShape<{
        BS: ArrayShape<I>;
      }> :
      never :
    T
  ;

  export type Of<T extends ShapeOrRecord> = Shape.Of<T> extends { [Tag]: infer T2 } ? T2 : never;

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
    L: Array<Of<T>>;
  }
  export interface Map<T extends Shape> {
    M: {
      [key: string]: Of<T> | undefined;
    };
  }
  export interface Struct<T extends RecordMembers> {
    M: {
      /**
       * Write each member and their documentation to the structure.
       * Write them all as '?' for now.
       */
      [M in keyof T]+?: AttributeValue.Of<T[M]>;
    } & {
      /**
       * Remove '?' from required properties.
       */
      [M in RequiredKeys<T>]-?: AttributeValue.Of<T[M]>;
    };
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
