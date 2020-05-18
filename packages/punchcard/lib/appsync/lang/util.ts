import { AnyShape, ArrayShape, BinaryShape, bool, boolean, BoolShape, CollectionShape, FunctionShape, literal, LiteralShape, map, MapShape, NeverShape, NothingShape, NumberShape, Pointer, Record, RecordMembers, RecordShape, RecordType, set, SetShape, Shape, ShapeGuards, ShapeVisitor, string, StringShape, TimestampShape, union, UnionShape } from '@punchcard/shape';
import { AttributeValue } from '@punchcard/shape-dynamodb';
import { VExpression } from './expression';
import { stash } from './statement';
import { StashProps } from './statement';
import { VTL, vtl } from './vtl';
import { VBool, VFloat, VInteger, VList, VMap, VNever, VObject, VString, VTimestamp } from './vtl-object';

/**
 * https://docs.aws.amazon.com/appsync/latest/devguide/resolver-util-reference.html
 */
export namespace $util {
  export function validate(condition: VBool, message: VString | string, errorType?: VString | string): VTL<VNever> {
    throw new Error('todo');
  }

  export function *autoId(): VTL<VString> {
    // return yield new Statements.Set(value, id);
    return yield* stash(new VString(VExpression.text('$util.autoId()')));
  }

  export function matches(str: VString, regex: RegExp | string): VBool {
    return new VBool(VExpression.call('$util.matches', [
      str,
      typeof regex === 'string' ? regex : regex.source
    ]));
  }

  export function unauthorized(): VNever {
    return new VNever(VExpression.text('$util.unauthorized()'));
  }

  /**
   * Returns a String describing the type of the Object. Supported type identifications
   * are: `Null`, `Number`, `String`, `Map`, `List`, `Boolean`. If a type cannot be
   * identified, the return type is `Object`.
   */
  export function typeOf<T extends VObject<Shape>>(obj: T): VString {
    return new VString(VExpression.concat(
      '$util.typeOf(', obj, ')'
    ));
  }

  // tslint:disable: unified-signatures
  export function error(message: VString | string, errorType: VString | string, data: VObject, errorInfo: VObject): VNever;
  export function error(message: VString | string, errorType: VString | string, data: VObject): VNever;
  export function error(message: VString | string, errorType: VString | string): VNever;
  export function error(message: VString | string): VNever;

  /**
   * @param message
   * @see https://docs.aws.amazon.com/appsync/latest/devguide/resolver-util-reference.html
   */
  export function error(message: VString | string, errorType?: VString | string, data?: VObject, errorInfo?: VObject): VNever {
    return new VNever(call('$util.error', [
      typeof message === 'string' ? `"${message}"` : message,
      typeof errorType === 'string' ? `"${errorType}"` : errorType,
      data,
      errorInfo
  ]));
  }

  export function isNull(value: VObject): VBool {
    return new VBool(new VExpression(state => state.write('$util.isNull(', value, ')')));
  }

  export function isNullOrEmpty(value: VObject): VBool {
    return new VBool(new VExpression(state => state.write('$util.isNullOrEmpty(', value, ')')));
  }

  export function isNotNull(value: VObject): VBool {
    return new VBool(new VExpression(state => state.write(`!$util.isNull(`, value, `)`)));
  }

  export function *defaultIfNull<T extends VObject>(obj: T, defaultValue: VObject.Like<VObject.TypeOf<T>>): VTL<T> {
    const type = VObject.getType(obj);
    const defaultV = yield* VObject.of(type, defaultValue);
    return VObject.fromExpr(type, new VExpression(state => state.write(
      '$util.defaultIfNull(', obj, ',', defaultV, ')'
    ))) as any;
  }
}

function call(functionName: string, args: (string | VObject | undefined)[]) {
  return new VExpression(state => {
    const parameters = [];
    for (const arg of args) {
      if (arg === undefined) {
        // we do this weird loop so we stop when we hit the first undefined parameter
        // that's so we can support overloaded methods like `$util.error`.
        break;
      }
      parameters.push(arg);
    }

    state.write(functionName, '(', ...parameters, ')');
  });
}

export namespace $util.dynamodb {
  /**
   * General object conversion tool for DynamoDB that converts input objects to the appropriate
   * DynamoDB representation. Unlike the built-in `$util.dynamodb.toDynamoDB` utility, the
   * extended form supports sets.
   *
   * @param object value to convert to its DynamoDB encoding
   */
  export function toDynamoDBExtended<T extends VObject>(object: T): VTL<VObject.Of<AttributeValue.ShapeOf<VObject.TypeOf<T>>>>;
  export function toDynamoDBExtended<T extends Shape>(type: T, obj: VObject.Like<T>): VTL<VObject.Of<AttributeValue.ShapeOf<T>>>;
  export function *toDynamoDBExtended(a: any, b?: any) {
    console.log('a', a, b);
    const stashProps: StashProps = {
      local: true // use local variables for intermediate stashes
    };
    const shape = ShapeGuards.isShape(a) ? a : VObject.getType(a);
    const dynamoShape = AttributeValue.shapeOf(shape) as Shape;
    const value: VObject.Like<Shape> = VObject.isObject(a) ? a : b;
    if (!hasSet(shape) && VObject.isObject(value)) {
      // if the object doesn't have any set types and is a reference, then use the built-in utility
      return toDynamoDB(value);
    }
    if (ShapeGuards.isStringShape(shape) || ShapeGuards.isTimestampShape(shape)) {
      return toString(value);
    } else if (ShapeGuards.isNumberShape(shape)) {
      return yield* vtl(dynamoShape, stashProps)`${toNumber(value)}`;
    } else if (ShapeGuards.isBoolShape(shape)) {
      return yield* vtl(dynamoShape, stashProps)`${toBoolean(value)}`;
    } else if (ShapeGuards.isNothingShape(shape)) {
      return yield* vtl(dynamoShape, stashProps)`${toNull()}`;
    } else if (ShapeGuards.isArrayShape(shape)) {
      return yield* toList(shape);
    } else if (ShapeGuards.isMapShape(shape)) {
    } else if (ShapeGuards.isArrayShape(shape)) {
      return yield* toList(shape);
    } else if (ShapeGuards.isSetShape(shape)) {
      if (VObject.isList(value)) {
        return ShapeGuards.isStringShape(shape.Items) || ShapeGuards.isTimestampShape(shape.Items) ? toStringSet(value as VList<StringShape>) :
          ShapeGuards.isNumberShape(shape.Items) ? toNumberSet(value as VList<NumberShape>) :
          ShapeGuards.isBinaryShape(shape.Items) ? toBinarySet(value as VList<BinaryShape>) :
          yield* toList(shape);
      } else {
        const tag =
          ShapeGuards.isStringShape(shape.Items) || ShapeGuards.isTimestampShape(shape.Items) ? 'SS' :
          ShapeGuards.isNumberShape(shape.Items) ? 'NS' :
          ShapeGuards.isBinaryShape(shape.Items) ? 'BS' :
          'L'
        ;
        const set = yield* vtl(dynamoShape)`{${tag}:[]}`;
        for (const item of value) {
          yield* (set as any)[tag].add(yield* toDynamoDBExtended(shape.Items, item));
        }
      }
    }

    function *toList(shape: CollectionShape<Shape>) {
      const list = yield* vtl(AttributeValue.List(AttributeValue.shapeOf(shape.Items)), stashProps)`{L: []}`;
      if (VObject.isList(value)) {
        yield* value.forEach(function*(item) {
          yield* list.L.add(yield* toDynamoDBExtended(shape.Items, item));
        });
      } else {
        for (const item of value) {
          yield* list.L.add(yield* toDynamoDBExtended(shape.Items, item));
        }
      }
      return list;
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
  export function toDynamoDB<T extends VObject>(object: T): VObject.Of<AppSyncDynamoDBFormat<VObject.TypeOf<T>>> {
    return VObject.fromExpr(
      appSyncDynamoDBFormat(VObject.getType(object)),
      VExpression.call('$util.dynamodb.toDynamoDB', [object])
    ) as VObject.Of<AppSyncDynamoDBFormat<VObject.TypeOf<T>>>;
  }

  /**
   * The same as $util.dynamodb.toDynamoDB(Object) : Map, but returns the DynamoDB attribute value
   * as a JSON encoded string.
   *
   * @param object value to convert to its DynamoDB encoding
   */
  export function toDynamoDBJson<T extends VObject>(object: T): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toDynamoDBJson', [object]));
  }

  /**
   * Returns a null in DynamoDB null format. This returns an object that describes the DynamoDB attribute value.
   * ```
   * Input:      $util.dynamodb.toNull()
   * Output:     { "NULL" : null }
   * ```
   */
  export function toNull(): VObject.Of<typeof AttributeValue.Nothing> {
    return VObject.fromExpr(AttributeValue.Nothing, VExpression.call('$util.dynamodb.toNull', []));
  }
  /**
   * The same as `$util.dynamodb.toNull`, but returns the DynamoDB attribute value as a JSON encoded string.
   */
  export function toNullJson(): VString {
    return new VString(VExpression.call('$util.dynamodb.toNullJson', []));
  }

  /**
   * Converts a boolean to the appropriate DynamoDB boolean format. This returns an object that describes the DynamoDB attribute value.
   * ```
   * Input:      $util.dynamodb.toBoolean(true)
   * Output:     { "BOOL" : true }
   * ```
   * @param bool to convert to a DynamoDB BOOL object.
   */
  export function toBoolean(bool: VBool | boolean): VObject.Of<typeof AttributeValue.Bool> {
    return VObject.fromExpr(AttributeValue.Bool, VExpression.call('$util.dynamodb.toBoolean', [typeof bool === 'boolean' ? bool.toString() : bool]));
  }
  /**
   * The same as `$util.dynamodb.toBoolean`, but returns the DynamoDB attribute value as a JSON encoded string.
   *
   * @param bool to convert to a DynamoDB BOOL object.
   */
  export function toBooleanJson(bool: VBool): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toBooleanJson', [typeof bool === 'boolean' ? `${bool}` : bool]));
  }

  /**
   * Converts binary data encoded as a base64 string to DynamoDB binary format. This returns an object that describes the DynamoDB attribute value.
   * ```
   * Input:      $util.dynamodb.toBinary("foo")
   * Output:     { "B" : "foo" }
   * ```
   * @param string to convert to a DynamoDB binary object.
   */
  export function toBinary(string: VString | string): VObject.Of<typeof AttributeValue.Binary> {
    return VObject.fromExpr(AttributeValue.Binary, VExpression.call('$util.dynamodb.toBinary', [string]));
  }
  /**
   * The same as `$util.dynamodb.toBinary`, but returns the DynamoDB attribute value as a JSON encoded string.
   *
   * @param str to convert to a DynamoDB binary object JSON string.
   */
  export function toBinaryJson(str: VString | string): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toBinaryJson', [str]));
  }
  /**
   * Converts a list of binary data encoded as base64 strings to DynamoDB binary set format. This returns an object that describes the DynamoDB attribute value.
   * ```
   * Input:      $util.dynamodb.toBinarySet([ "foo", "bar", "baz" ])
   * Output:     { "BS" : [ "foo", "bar", "baz" ] }
   * ```
   * @param list of strings to convert to a DynamoDB binary set.
   */
  export function toBinarySet(list: VList<StringShape | BinaryShape>): VObject.Of<typeof AttributeValue.BinarySet> {
    return VObject.fromExpr(AttributeValue.BinarySet, VExpression.call('$util.dynamodb.toBinarySet', [list]));
  }
  /**
   * The same as `$util.dynamodb.toBinarySet`, but returns the DynamoDB attribute value as a JSON encoded string.
   *
   * @param list of strings to convert to a DynamoDB binary set.
   */
  export function toBinarySetJson(list: VList<StringShape>): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toBinarySet', [list]));
  }

  /**
   * Converts a number to the DynamoDB number format. This returns an object that describes the DynamoDB attribute value.
   * ```
   * Input:      $util.dynamodb.toNumber(12345)
   * Output:     { "N" : 12345 }
   * ```
   * @param number to convert to a DynamoDB number object.
   */
  export function toNumber(number: VInteger | VFloat | number): VObject.Of<typeof AttributeValue.Number> {
    return VObject.fromExpr(AttributeValue.Number, VExpression.call('$util.dynamodb.toNumber', [typeof number === 'number' ? number.toString(10) : number]));
  }
  /**
   * The same as `$util.dynamodb.toNumber`, but returns the DynamoDB attribute value as a JSON encoded string.
   * @param number to convert to a DynamoDB number object.
   */
  export function toNumberJson(number: VInteger | VFloat | number): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toNumberJson', [typeof number === 'number' ? number.toString(10) : number]));
  }
  /**
   * Converts a list of numbers to the DynamoDB number set format. This returns an object that describes the DynamoDB attribute value.
   *
   * ```
   * Input:      $util.dynamodb.toNumberSet([ 1, 23, 4.56 ])
   * Output:     { "NS" : [ 1, 23, 4.56 ] }
   * ```
   * @param list of numbers to convert to a DynamoDB number set.
   */
  export function toNumberSet(list: VList<NumberShape>): VObject.Of<typeof AttributeValue.NumberSet> {
    return VObject.fromExpr(AttributeValue.NumberSet, VExpression.call('$util.dynamodb.toNumberSet', [list]));
  }
  /**
   * The same as `$util.dynamodb.toNumberSet`, but returns the DynamoDB attribute value as a JSON encoded string.
   *
   * @param list of numbers to convert to a DynamoDB number set JSON string.
   */
  export function toNumberSetJson(value: VList<NumberShape>): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toNumberSetJson', [value]));
  }

  /**
   * Convert an input string to the DynamoDB string format. This returns an object that describes the DynamoDB attribute value.
   *
   * ```
   * Input:      $util.dynamodb.toString("foo")
   * Output:     { "S" : "foo" }
   * ```
   * @param value string to convert into a DynamoDB string object.
   */
  export function toString(value: VString | string): VObject.Of<typeof AttributeValue.String> {
    return VObject.fromExpr(AttributeValue.String, VExpression.call('$util.dynamodb.toString', [value]));
  }
  /**
   * The same as `$util.dynamodb.toString(String)`, but returns the DynamoDB attribute value as a JSON encoded string.
   *
   * @param value string to convert into a DynamoDB string object JSON string.
   */
  export function toStringJson(value: VString): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toStringJson', [value]));
  }
  /**
   * Converts a lists with Strings to the DynamoDB string set format. This returns an object that describes the DynamoDB attribute value.
   * ```
   * Input:      $util.dynamodb.toStringSet([ "foo", "bar", "baz" ])
   * Output:     { "SS" : [ "foo", "bar", "baz" ] }
   * ```
   * @param list list of strings to convert to a DynamoDB string set.
   */
  export function toStringSet(list: VList<StringShape | TimestampShape>): VObject.Of<typeof AttributeValue.StringSet> {
    return VObject.fromExpr(AttributeValue.StringSet, VExpression.call('$util.dynamodb.toStringSet', [list]));
  }
  /**
   * The same as `$util.dynamodb.toStringSet`, but returns the DynamoDB attribute value as a JSON encoded string.
   *
   * @param list list of strings to convert to a DynamoDB string set JSON string.
   */
  export function toStringSetJson(list: VList<StringShape>): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toStringSetJson', [list]));
  }

  /**
   * Converts a list of object to DynamoDB list format. Each item in the list is also converted to
   * its appropriate DynamoDB format. It’s opinionated about how it represents some of the nested
   * objects: e.g., it will use lists (`L`) rather than sets (`SS`, `NS`, `BS`). This returns an
   * object that describes the DynamoDB attribute value.
   *
   * ```
   * Input: $util.dynamodb.toList([ "foo", 123, { "bar" : "baz" } ])
   * Output:
   * {
   *   "L" : [
   *     { "S" : "foo" },
   *     { "N" : 123 },
   *     {
   *        "M" : {
   *          "bar" : { "S" : "baz" }
   *        }
   *     }
   *   ]
   * }
   * ```
   * @param list to convert to a DynamoDB list object.
   */
  export function toList<T extends Shape>(list: VList<T>): VObject.Of<AttributeValue.List<AppSyncDynamoDBFormat<T>>> {
    return VObject.fromExpr(
      appSyncDynamoDBFormat(VObject.getType(list)),
      VExpression.call('$util.dynamodb.toList', [list])
    ) as VObject.Of<AttributeValue.List<AppSyncDynamoDBFormat<T>>>;
  }
  /**
   * The same as `$util.dynamodb.toList`, but returns the DynamoDB attribute value as a JSON encoded string.
   *
   * @param list to convert to a DynamoDB list object JSON string.
   */
  export function toListJson<T extends Shape>(list: VList<T>): VString {
    return VObject.fromExpr(string, VExpression.call('$util.dynamodb.toListJson', [list]));
  }

  /**
   * Converts a map to DynamoDB map format. Each value in the map is also converted to its
   * appropriate DynamoDB format. It’s opinionated about how it represents some of the nested
   * objects: e.g., it will use lists (`L`) rather than sets (`SS`, `NS`, `BS`). This returns an
   * object that describes the DynamoDB attribute value.
   *
   * ```
   * Input:      $util.dynamodb.toMap({ "foo": "bar", "baz" : 1234, "beep": [ "boop"] })
   * Output: {
   *   "M" : {
   *     "foo"  : { "S" : "bar" },
   *     "baz"  : { "N" : 1234 },
   *     "beep" : {
   *       "L" : [
   *         { "S" : "boop" }
   *       ]
   *     }
   *   }
   * }
   * ```
   * @param map to convert to a DynamoDB map.
   */
  export function toMap<T extends Shape>(map: VMap<T>): VObject.Of<AttributeValue.Map<AppSyncDynamoDBFormat<T>>> {
    return VObject.fromExpr(
      appSyncDynamoDBFormat(VObject.getType(map)),
      VExpression.call('$util.dynamodb.toMap', [map])
    ) as VObject.Of<AttributeValue.Map<AppSyncDynamoDBFormat<T>>>;
  }
  /**
   * The same as `$util.dynamodb.toMap`, but returns the DynamoDB attribute value as a JSON encoded string.
   * @param map to convert to a DynamoDB map.
   */
  export function toMapJson<T extends Shape>(map: VMap<T>): VString {
    return new VString(VExpression.call('$util.dynamodb.toMapJson', [map]));
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
}

export namespace $util.time {
  export function *nowISO8601(): VTL<VTimestamp> {
    return yield* stash(new VTimestamp(VExpression.text('$util.time.nowISO8601()')));
  }
  export function *nowEpochSeconds() : VTL<VInteger> {
    return yield* stash(new VInteger(VExpression.text('$util.time.nowISO8601()')));
  }
  export function *nowEpochMilliSeconds() : VTL<VInteger> {
    return yield* stash(new VInteger(VExpression.text('$util.time.nowEpochMilliSeconds()')));
  }
  export function *nowFormatted(format: VString) : VTL<VString> {
    return yield* stash(new VString(VExpression.concat(
      VExpression.text('$util.time.nowFormatted('),
      format,
      VExpression.text(')')
    )));
  }
  // export function parseFormattedToEpochMilliSeconds(VString, VString) : VTL<VInteger> {

  // }
  // export function parseFormattedToEpochMilliSeconds(VString, VString, VString) : VTL<VInteger> {

  // }
  export function parseISO8601ToEpochMilliSeconds(s: VTL<VString>) : VTL<VInteger> {
    throw new Error('not implemented');
  }
  // export function epochMilliSecondsToSeconds(VInteger) : VTL<VInteger> {
  //   throw new Error('not implemented');
  // }
  // export function epochMilliSecondsToISO8601(VInteger) : VTL<VString> {
  //   throw new Error('not implemented');
  // }
  // export function epochMilliSecondsToFormatted(VInteger, VString) : VTL<VString> {
  //   throw new Error('not implemented');
  // }
  // export function epochMilliSecondsToFormatted(VInteger, VString, VString) : VTL<VString> {
  //   throw new Error('not implemented');
  // }
}

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
