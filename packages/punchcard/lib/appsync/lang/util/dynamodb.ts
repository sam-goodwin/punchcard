import { AnyShape, array, ArrayShape, binary, BinaryShape, bool, boolean, BoolShape, CollectionShape, FunctionArgs, FunctionShape, literal, LiteralShape, map, MapShape, NeverShape, NothingShape, NumberShape, Pointer, Record, RecordMembers, RecordShape, RecordType, set, SetShape, Shape, ShapeGuards, ShapeVisitor, string, StringShape, TimestampShape, union, UnionShape } from '@punchcard/shape';
import { AttributeValue } from '@punchcard/shape-dynamodb';
import { VExpression } from '../expression';
import { StashProps } from '../statement';
import { VTL, vtl } from '../vtl';
import { VBool, VFloat, VInteger, VList, VMap, VObject, VString } from '../vtl-object';

type _HasSet<T extends Shape> =
  T extends SetShape<any> ? true :
  T extends RecordShape<infer F> ? Extract<{
    [f in keyof F]: HasSet<F[f]>
  }[keyof F], boolean> :
  T extends CollectionShape<infer I> ? Extract<{
    [i in keyof I]: HasSet<I>
  }[keyof I], boolean> :
  T extends UnionShape<infer I> ? Extract<{
    [i in Extract<keyof I, number>]: HasSet<I[i]>;
  }[Extract<keyof I, number>], boolean> :
  false
;
export type HasSet<T extends Shape> =
  true extends _HasSet<T> ? true :
  false
;

function hasSet<T extends Shape>(shape: T): HasSet<T> {
  if (ShapeGuards.isSetShape(shape)) {
    return true as HasSet<T>;
  } else if (ShapeGuards.isRecordShape(shape)) {
    return (Object.values(shape.Members).find(m => hasSet(m)) !== undefined) as HasSet<T>;
  } else if (ShapeGuards.isCollectionShape(shape)) {
    return hasSet(shape.Items) as HasSet<T>;
  } else if (ShapeGuards.isUnionShape(shape)) {
    return (shape.Items.find(i => hasSet(i)) !== undefined) as HasSet<T>;
  }
  return false as HasSet<T>;
}

/**
 * AppSync is opinionated about how it represents some types: e.g., it will
 * use lists (“L”) rather than sets (“SS”, “NS”, “BS”). This returns an object that describes
 * the DynamoDB attribute value.
 */
type AppSyncDynamoDBFormat<T extends Shape> = AttributeValue.ShapeOf<T, {
  setAsList: true
}>;

function appSyncDynamoDBFormat<T extends Shape>(shape: T): AppSyncDynamoDBFormat<T> {
  return AttributeValue.shapeOf(shape, {
    // AppSync's built-in toDynamoDB utility treats all sets as lists ... :(
    setAsList: true
  } as const) as any as AppSyncDynamoDBFormat<T>;
}

export class $DynamoDBUtil {
  /**
   * General object conversion tool for DynamoDB that converts input objects to the appropriate
   * DynamoDB representation. Unlike the built-in `$util.dynamodb.toDynamoDB` utility, the
   * extended form supports sets.
   *
   * @param object value to convert to its DynamoDB encoding
   */
  public toDynamoDBExtended<T extends VObject>(object: T): VTL<VObject.Of<AttributeValue.ShapeOf<VObject.TypeOf<T>>>>;
  public toDynamoDBExtended<T extends Shape>(type: T, obj: VObject.Like<T>): VTL<VObject.Of<AttributeValue.ShapeOf<T>>>;
  public *toDynamoDBExtended(a: any, b?: any) {
    const stashProps: StashProps = {
      local: true // use local variables for intermediate stashes
    };
    const shape = ShapeGuards.isShape(a) ? a : VObject.getType(a);
    const dynamoShape = AttributeValue.shapeOf(shape) as Shape;
    const value: VObject.Like<Shape> = VObject.isObject(a) ? a : b;
    if (!hasSet(dynamoShape) && VObject.isObject(value)) {
      // if the object doesn't have any set types and is a reference, then use the built-in utility
      return this.toDynamoDB(value);
    }
    if (ShapeGuards.isStringShape(shape) || ShapeGuards.isTimestampShape(shape)) {
      return yield* vtl(dynamoShape, stashProps)`${this.toString(value)}`;
    } else if (ShapeGuards.isNumberShape(shape)) {
      return yield* vtl(dynamoShape, stashProps)`${this.toNumber(value)}`;
    } else if (ShapeGuards.isBoolShape(shape)) {
      return yield* vtl(dynamoShape, stashProps)`${this.toBoolean(value)}`;
    } else if (ShapeGuards.isNothingShape(shape)) {
      return yield* vtl(dynamoShape, stashProps)`${this.toNull()}`;
    } else if (ShapeGuards.isArrayShape(shape)) {
      const itemDynamoShape = AttributeValue.shapeOf(shape.Items);
      const list = yield* vtl(AttributeValue.List(itemDynamoShape), stashProps)`{}`;
      if (VObject.isObject(value)) {
        // array must have set within
        throw new Error(`todo`);
      } else {
        for (const item of value) {
          yield* list.L.add(yield* this.toDynamoDBExtended(shape.Items, item));
        }
      }
      return list;
    } else if (ShapeGuards.isMapShape(shape)) {

    }

    return null as any;
  }

  /**
   * General object conversion tool for DynamoDB that converts input objects to the appropriate
   * DynamoDB representation. It’s opinionated about how it represents some types: e.g., it will
   * use lists (“L”) rather than sets (“SS”, “NS”, “BS”). This returns an object that describes
   * the DynamoDB attribute value.
   *
   * @param object value to convert to its DynamoDB encoding
   */
  public toDynamoDB<T extends VObject>(object: T): VObject.Of<AppSyncDynamoDBFormat<VObject.TypeOf<T>>> {
    return VObject.fromExpr(
      appSyncDynamoDBFormat(VObject.getType(object)),
      VExpression.call('$util.dynamodb.toDynamoDB', object)
    ) as VObject.Of<AppSyncDynamoDBFormat<VObject.TypeOf<T>>>;
  }

  /**
   * The same as $util.dynamodb.toDynamoDB(Object) : Map, but returns the DynamoDB attribute value
   * as a JSON encoded string.
   *
   * @param object value to convert to its DynamoDB encoding
   */
  public toDynamoDBJson<T extends VObject>(object: T): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toDynamoDBJson', object));
  }

  public toNull(): VObject.Of<typeof AttributeValue.Nothing> {
    return VObject.fromExpr(AttributeValue.Nothing, VExpression.call('$util.dynamodb.toNull'));
  }

  public toBoolean(object: VBool | boolean): VObject.Of<typeof AttributeValue.Bool> {
    return VObject.fromExpr(AttributeValue.Bool, VExpression.call('$util.dynamodb.toBoolean', typeof object === 'boolean' ? object.toString() : object));
  }
  public toBooleanJson(object: VBool): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toBooleanJson', typeof object === 'boolean' ? `${object}` : object));
  }

  public toBinary(object: VString | string): VObject.Of<typeof AttributeValue.Binary> {
    return VObject.fromExpr(AttributeValue.Binary, VExpression.call('$util.dynamodb.toBinary', object));
  }
  public toBinaryJson(object: VString | string): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toBinaryJson', object));
  }
  public toBinarySet(value: VList<StringShape>): VObject.Of<typeof AttributeValue.BinarySet> {
    return VObject.fromExpr(AttributeValue.BinarySet, VExpression.call('$util.dynamodb.toBinarySet', value));
  }
  public toBinarySetJson(value: VList<StringShape>): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toBinarySet', value));
  }

  public toNumber(object: VInteger | VFloat | number): VObject.Of<typeof AttributeValue.Number> {
    return VObject.fromExpr(AttributeValue.Number, VExpression.call('$util.dynamodb.toNumber', typeof object === 'number' ? object.toString(10) : object));
  }
  public toNumberJson(object: VInteger | VFloat | number): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toNumberJson', typeof object === 'number' ? object.toString(10) : object));
  }
  public toNumberSet(value: VList<NumberShape>): VObject.Of<typeof AttributeValue.NumberSet> {
    return VObject.fromExpr(AttributeValue.NumberSet, VExpression.call('$util.dynamodb.toNumberSet', value));
  }
  public toNumberSetJson(value: VList<NumberShape>): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toNumberSetJson', value));
  }

  public toString(value: VString): VObject.Of<typeof AttributeValue.String> {
    return VObject.fromExpr(AttributeValue.String, VExpression.call('$util.dynamodb.toString', value));
  }
  public toStringJson(value: VString): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toStringJson', value));
  }
  public toStringSet(value: VList<StringShape>): VObject.Of<typeof AttributeValue.StringSet> {
    return VObject.fromExpr(AttributeValue.StringSet, VExpression.call('$util.dynamodb.toStringSet', value));
  }
  public toStringSetJson(value: VList<StringShape>): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toStringSetJson', value));
  }

  public toList<T extends Shape>(list: VList<T>): VObject.Of<AttributeValue.List<AppSyncDynamoDBFormat<T>>> {
    return VObject.fromExpr(
      appSyncDynamoDBFormat(VObject.getType(list)),
      VExpression.call('$util.dynamodb.toList', list)
    ) as VObject.Of<AttributeValue.List<AppSyncDynamoDBFormat<T>>>;
  }
  public toListJson<T extends Shape>(list: VList<T>): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toListJson', list));
  }

  public toMap<T extends Shape>(list: VMap<T>): VObject.Of<AttributeValue.Map<AppSyncDynamoDBFormat<T>>> {
    return VObject.fromExpr(
      appSyncDynamoDBFormat(VObject.getType(list)),
      VExpression.call('$util.dynamodb.toMap', list)
    ) as VObject.Of<AttributeValue.Map<AppSyncDynamoDBFormat<T>>>;
  }
  public toMapJson<T extends Shape>(list: VList<T>): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toMapJson', list));
  }
}

/**
 * Converts a Shape to its DynamoDB representation.
 *
 * According to the opinonated approach of `$util.dynamodb.toDynamoDB`
 *
 * @see https://docs.aws.amazon.com/appsync/latest/devguide/resolver-util-reference.html
 */
export type ToDynamoDBJson<T extends Shape> =
  T extends AnyShape ? AttributeValue :
  T extends BoolShape ? typeof AttributeValue.Bool :
  T extends NothingShape ? typeof AttributeValue.Nothing :
  T extends NumberShape ? typeof AttributeValue.Number :
  T extends StringShape ? typeof AttributeValue.String :
  T extends TimestampShape ? typeof AttributeValue.String :
  T extends BinaryShape ? typeof AttributeValue.Binary :
  T extends SetShape<infer I> ? AttributeValue.List<ToDynamoDBJson<I>> :
  T extends ArrayShape<infer I> ? AttributeValue.List<ToDynamoDBJson<I>> :
  T extends MapShape<infer V> ? AttributeValue.Map<ToDynamoDBJson<V>> :
  T extends RecordShape<infer M> ? AttributeValue.Struct<{
    [m in keyof M]: ToDynamoDBJson<M[m]>;
  }> :
  AttributeValue // <- never?
;
