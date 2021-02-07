import { any, AnyShape, array, ArrayShape, AssertIsShape, binary, BinaryShape, boolean, BoolShape, EnumShape, literal, LiteralShape, map, MapShape, NothingShape, NumberShape, RequiredKeys, SetShape, Shape, ShapeGuards, string, StringShape, TimestampShape, union, UnionShape, Value } from '@punchcard/shape';
import { Type, TypeClass, TypeShape} from '@punchcard/shape/lib/type';

// tslint:disable: ban-types

export namespace AttributeValue {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-dynamodb.AttributeValue.Tag');

  export interface ShapeOfProps {
    /**
     * Will represent all sets as lists.
     * @default false
     */
    setAsList?: boolean;
  }

  export type ShapeOf<T extends Shape, Props extends ShapeOfProps = {
    setAsList: false
  }> =
    T extends StringShape | TimestampShape ? typeof AttributeValue.String :
    T extends EnumShape ? AttributeValue.Enum<T> :
    T extends NumberShape ? typeof AttributeValue.Number :
    T extends BoolShape ? typeof AttributeValue.Bool :
    T extends BinaryShape ? typeof AttributeValue.Binary :
    T extends NothingShape ? typeof AttributeValue.Nothing :
    T extends AnyShape ? AnyShape :
    T extends ArrayShape<infer I> ? AttributeValue.List<ShapeOf<I, Props>> :
    T extends MapShape<infer V> ? AttributeValue.Map<ShapeOf<V, Props>> :
    T extends SetShape<infer I> ?
      Props['setAsList'] extends true ? AttributeValue.List<ShapeOf<I, Props>> :
      I extends BinaryShape ? typeof AttributeValue.BinarySet :
      I extends StringShape ? typeof AttributeValue.StringSet :
      I extends NumberShape ? typeof AttributeValue.NumberSet :
      AttributeValue.List<ShapeOf<I, Props>>
      :
    T extends TypeShape<infer Fields> ? AttributeValue.Struct<{
      [field in keyof Fields]: ShapeOf<Fields[field], Props>
    }> :
    T extends UnionShape<infer I> ? UnionShape<{
      [i in keyof I]: ShapeOf<AssertIsShape<I[i]>, Props>
    }> :
    T extends LiteralShape<infer I> ? {
      [i in keyof I]: ShapeOf<I, Props>
    }[keyof I] :
    T extends { [Tag]: infer T2 } ? T2 :
    AnyShape
  ;

  /**
   * Derives a shape representing `T` in DynamoDB JSON.
   *
   * @param shape to derive a DynamoDB Shape for.
   */
  export function shapeOf<T extends Shape, Props extends ShapeOfProps = {
    readonly setAsList: false
  }>(shape: T, props?: Props): ShapeOf<T> {
    (props as any) = props || {
      setAsList: false
    };
    if (ShapeGuards.isStringShape(shape) || ShapeGuards.isTimestampShape(shape)) {
      return AttributeValue.String as ShapeOf<T>;
    } else if (ShapeGuards.isNumberShape(shape)) {
      return AttributeValue.Number as ShapeOf<T>;
    } else if (ShapeGuards.isBoolShape(shape)) {
      return AttributeValue.Bool as ShapeOf<T>;
    } else if (ShapeGuards.isBinaryShape(shape)) {
      return AttributeValue.Binary as ShapeOf<T>;
    } else if (ShapeGuards.isNothingShape(shape)) {
      return AttributeValue.Nothing as ShapeOf<T>;
    } else if (ShapeGuards.isAnyShape(shape)) {
      return shape as ShapeOf<T>;
    } else if (ShapeGuards.isArrayShape(shape)) {
      return AttributeValue.List(shapeOf(shape.Items, props)) as ShapeOf<T>;
    } else if (ShapeGuards.isMapShape(shape)) {
      return AttributeValue.Map(shapeOf(shape.Items, props)) as ShapeOf<T>;
    } else if (ShapeGuards.isSetShape(shape)) {
      if (props?.setAsList === true) {
        return AttributeValue.List(shapeOf(shape.Items, props)) as ShapeOf<T>;
      } else if (ShapeGuards.isStringShape(shape.Items)) {
        return AttributeValue.StringSet as ShapeOf<T>;
      } else if (ShapeGuards.isNumberShape(shape.Items)) {
        return AttributeValue.NumberSet as ShapeOf<T>;
      } else if (ShapeGuards.isBinaryShape(shape.Items)) {
        return AttributeValue.BinarySet as ShapeOf<T>;
      } else {
        return AttributeValue.List(shapeOf(shape.Items, props)) as ShapeOf<T>;
      }
    } else if (ShapeGuards.isRecordShape(shape)) {
      return AttributeValue.Struct(Object.entries(shape.Members).map(([name, field]) => ({
        [name]: shapeOf(field)
      })).reduce((a, b) => ({...a,...b}))) as ShapeOf<T>;
    } else if (ShapeGuards.isUnionShape(shape)) {
      return union(...shape.Items.map(item => shapeOf(item))) as ShapeOf<T>;
    }
    return any as ShapeOf<T>;
  }
}

export type AttributeValue = (
  | AnyShape
  | typeof AttributeValue.Nothing
  | typeof AttributeValue.Binary
  | typeof AttributeValue.BinarySet
  | typeof AttributeValue.Bool
  | typeof AttributeValue.Number
  | typeof AttributeValue.NumberSet
  | typeof AttributeValue.String
  | typeof AttributeValue.StringSet
  | AttributeValue.List<AttributeValue>
  | AttributeValue.Map<AttributeValue>
  | AttributeValue.Struct<AttributeValue.StructFields>
);

export namespace AttributeValue {
  export class Nothing extends Type({
    NULL: literal(boolean, true as const)
  }) {}
  export class Binary extends Type({
    B: binary
  }) {}
  export class BinarySet extends Type({
    BS: array(binary)
  }) {}
  export class Bool extends Type({
    BOOL: boolean
  }) {}
  export class Number extends Type({
    N: string
  }) {}
  export class NumberSet extends Type({
    NS: array(string)
  }) {}
  export class String extends Type({
    S: string
  }) {}
  export interface Enum<E extends EnumShape> {
    S: E
  }
  export const Enum = <E extends EnumShape>(e: E) => Type({
    S: e
  });
  export class StringSet extends Type({
    SS: array(string)
  }) {}

  export interface List<T extends AttributeValue> extends TypeShape<{
    L: ArrayShape<T>;
  }> {}
  export const List = <T extends AttributeValue>(item: T): List<T> => Type({
    L: array(item)
  }) as any as List<T>;
  export interface Map<T extends AttributeValue> extends TypeClass<{
    M: MapShape<T>;
  }> {}
  export const Map = <T extends AttributeValue>(item: T): Map<T> => Type({
    M: map(item)
  }) as any as Map<T>;
  export interface StructFields {
    [fieldName: string]: AttributeValue;
  }
  export interface Struct<F extends StructFields> extends TypeClass<{
    M: TypeShape<F>;
  }> {}
  export const Struct = <F extends StructFields>(fields: F): Struct<F> => Type({
    M: Type(fields)
  });
}