import { AnyShape, array, ArrayShape, binary, BinaryShape, bool, boolean, BoolShape, CollectionShape, DynamicShape, FunctionArgs, FunctionShape, literal, LiteralShape, map, MapShape, NeverShape, NothingShape, NumberShape, Pointer, Record, RecordMembers, RecordShape, RecordType, set, SetShape, Shape, ShapeGuards, ShapeVisitor, string, StringShape, TimestampShape, union, UnionShape } from '@punchcard/shape';
import { AttributeValue } from '@punchcard/shape-dynamodb';
import { VExpression } from '../expression';
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

class R extends Record({
  a: array(string),
  s: set(string)
}) {}

const r = hasSet(R);

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

class A extends Record({
  key: string,
  map: map(string),
  list: array(string),
  set: set(string)
}) {}


export class $DynamoDBUtil {
  /**
   * General object conversion tool for DynamoDB that converts input objects to the appropriate
   * DynamoDB representation. It’s opinionated about how it represents some types: e.g., it will
   * use lists (“L”) rather than sets (“SS”, “NS”, “BS”). This returns an object that describes
   * the DynamoDB attribute value.
   *
   * @param object value to convert to its DynamoDB encoding
   */
  public toDynamoDB<T extends VObject>(object: T): VObject.Of<AppSyncDynamoDBFormat<VObject.TypeOf<T>>> {
    return VObject.ofExpression(
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
    return VObject.ofExpression(string, VExpression.call('$util.dynamodb.toDynamoDBJson', object));
  }

  public toNull(): VObject.Of<typeof AttributeValue.Nothing> {
    return VObject.ofExpression(AttributeValue.Nothing, VExpression.call('$util.dynamodb.toNull',));
  }

  public toBoolean(object: VBool): VObject.Of<typeof AttributeValue.Bool> {
    return VObject.ofExpression(AttributeValue.Bool, VExpression.call('$util.dynamodb.toBoolean', object));
  }
  public toBooleanJson(object: VBool): VString {
    return VObject.ofExpression(string, VExpression.call('$util.dynamodb.toBooleanJson', object));
  }

  public toBinary(object: VString): VObject.Of<typeof AttributeValue.Binary> {
    return VObject.ofExpression(AttributeValue.Binary, VExpression.call('$util.dynamodb.toBinary', object));
  }
  public toBinaryJson(object: VString): VString {
    return VObject.ofExpression(string, VExpression.call('$util.dynamodb.toBinaryJson', object));
  }
  public toBinarySet(value: VList<StringShape>): VObject.Of<typeof AttributeValue.BinarySet> {
    return VObject.ofExpression(AttributeValue.BinarySet, VExpression.call('$util.dynamodb.toBinarySet', value));
  }
  public toBinarySetJson(value: VList<StringShape>): VString {
    return VObject.ofExpression(string, VExpression.call('$util.dynamodb.toBinarySet', value));
  }

  public toNumber<N extends VInteger | VFloat>(object: N): VObject.Of<typeof AttributeValue.Number> {
    return VObject.ofExpression(AttributeValue.Number, VExpression.call('$util.dynamodb.toNumber', object));
  }
  public toNumberJson<N extends VInteger | VFloat>(object: N): VString {
    return VObject.ofExpression(string, VExpression.call('$util.dynamodb.toNumberJson', object));
  }
  public toNumberSet(value: VList<NumberShape>): VObject.Of<typeof AttributeValue.NumberSet> {
    return VObject.ofExpression(AttributeValue.NumberSet, VExpression.call('$util.dynamodb.toNumberSet', value));
  }
  public toNumberSetJson(value: VList<NumberShape>): VString {
    return VObject.ofExpression(string, VExpression.call('$util.dynamodb.toNumberSetJson', value));
  }

  public toString(value: VString): VObject.Of<typeof AttributeValue.String> {
    return VObject.ofExpression(AttributeValue.String, VExpression.call('$util.dynamodb.toString', value));
  }
  public toStringJson(value: VString): VString {
    return VObject.ofExpression(string, VExpression.call('$util.dynamodb.toStringJson', value));
  }
  public toStringSet(value: VList<StringShape>): VObject.Of<typeof AttributeValue.StringSet> {
    return VObject.ofExpression(AttributeValue.StringSet, VExpression.call('$util.dynamodb.toStringSet', value));
  }
  public toStringSetJson(value: VList<StringShape>): VString {
    return VObject.ofExpression(string, VExpression.call('$util.dynamodb.toStringSetJson', value));
  }

  public toList<T extends Shape>(list: VList<T>): VObject.Of<AttributeValue.List<AppSyncDynamoDBFormat<T>>> {
    return VObject.ofExpression(
      appSyncDynamoDBFormat(VObject.getType(list)),
      VExpression.call('$util.dynamodb.toList', list)
    ) as VObject.Of<AttributeValue.List<AppSyncDynamoDBFormat<T>>>;
  }
  public toListJson<T extends Shape>(list: VList<T>): VString {
    return VObject.ofExpression(string, VExpression.call('$util.dynamodb.toListJson', list));
  }

  public toMap<T extends Shape>(list: VMap<T>): VObject.Of<AttributeValue.Map<AppSyncDynamoDBFormat<T>>> {
    return VObject.ofExpression(
      appSyncDynamoDBFormat(VObject.getType(list)),
      VExpression.call('$util.dynamodb.toMap', list)
    ) as VObject.Of<AttributeValue.Map<AppSyncDynamoDBFormat<T>>>;
  }
  public toMapJson<T extends Shape>(list: VList<T>): VString {
    return VObject.ofExpression(string, VExpression.call('$util.dynamodb.toMapJson', list));
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
