import { any, array, binary, BinaryShape, boolean, EnumShape, integer, LiteralShape, never, NeverShape, nothing, NothingShape, number, ShapeGuards, ShapeVisitor, timestamp, Value } from '@punchcard/shape';
import { AnyShape, ArrayShape, BoolShape, IntegerShape, MapShape, NumberShape, SetShape, Shape, StringShape, TimestampShape, TypeShape } from '@punchcard/shape';
import { string } from '@punchcard/shape';
import { FunctionArgs, FunctionShape } from '@punchcard/shape/lib/function';
import { IsInstance } from '@punchcard/shape/lib/is-instance';
import { UnionShape } from '@punchcard/shape/lib/union';
import { VExpression } from './expression';
import { ElseBranch, forLoop, IfBranch, stash } from './statement';
import { $util } from './util';
import { VTL, vtl } from './vtl';

const VObjectType = Symbol.for('VObjectType');
const VObjectExpr = Symbol.for('VObjectExpr');

function weakMap(): WeakMap<any, {
  type: Shape;
  expr: VExpression;
}> {
  if (!(global as any)[VObjectType]) {
    (global as any)[VObjectType] = new WeakMap();
  }
  return (global as any)[VObjectType];
}

export class VObject<T extends Shape = Shape> {
  constructor(type: T, expr: VExpression) {
    weakMap().set(this, {
      type,
      expr
    });
  }

  public get [VObjectType](): T {
    return weakMap().get(this)!.type as T;
  }
  public get [VObjectExpr](): VExpression {
    return weakMap().get(this)!.expr;
  }

  public hashCode(): VInteger {
    return new VInteger(VExpression.call(this, 'hashCode', []));
  }

  public as<T extends Shape>(t: T): VObject.Of<T> {
    return VObject.fromExpr(t, this[VObjectExpr]);
  }

  public notEquals(other: this | Value.Of<T>): VBool {
    return new VBool(VExpression.concat(
      this, ' != ', VObject.isObject(other) ? other : VExpression.json(other)
    ));
  }

  public equals(other: this | Value.Of<T>): VBool {
    return new VBool(VExpression.concat(
      this, ' == ', VObject.isObject(other) ? other : VExpression.json(other)
    ));
  }
}

export namespace VObject {
  export function *of<T extends Shape>(type: T, value: VObject.Like<T>): VTL<VObject.Of<T>> {
    if (VExpression.isExpression(value)) {
      return VObject.fromExpr(type, value);
    }

    if (ShapeGuards.isAnyShape(type)) {
      // TODO: support any
      throw new Error(`unsupported VTL type: any`);
    }
    if (VObject.isObject(value)) {
      return value;
    } else if (ShapeGuards.isArrayShape(type) || ShapeGuards.isSetShape(type)) {
      const arr: VObject = yield* vtl(type)`[]`;
      for (const item of (value as Shape[])) {
        yield* vtl`${arr}.add(${yield* of(type.Items, item)}`;
      }
      return arr as VObject.Of<T>;
    } else if (ShapeGuards.isRecordShape(type)) {
      const record: VObject = yield* vtl(type)`{}`;
      if (type.FQN !== undefined) {
        yield* vtl`$util.qr(${record}.put("__typename", "${type.FQN!}"))`;
      }
      for (const [fieldName, fieldType] of Object.entries(type.Members)) {
        const fieldValue = (value as any)[fieldName];
        if (fieldValue === undefined) {
          console.log(fieldName, fieldValue, value);
        }
        yield* vtl`$util.qr(${record}.put("${fieldName}", ${yield* of(fieldType, fieldValue)}))`;
      }
      return record as VObject.Of<T>;
    } else if (ShapeGuards.isMapShape(type)) {
      const fieldType = type.Items;
      const map: VObject = yield* vtl(type)`{}`;
      for (const [fieldName, fieldValue] of Object.entries(value)) {
        yield* vtl`$util.qr(${map}.put("${fieldName}", ${yield* of(fieldType, fieldValue)}))`;
      }
      return map as VObject.Of<T>;
    } else if (ShapeGuards.isUnionShape(type)) {
      const itemType = type.Items.find(item => isLike(item, value));
      if (itemType) {
        // write to VTL using the item's type
        const itemValue = yield* of(itemType, value);
        // return an instance of the union
        return VObject.fromExpr(type as T, VObject.getExpr(itemValue)) as VObject.Of<T>;
      }
      console.log(type);
      console.log(value, typeof value);
      throw new Error(`value did not match item in the UnionShape: ${type.Items.map(i => i.Kind).join(',')}`);
    }

    // stringify primitives
    try {
      const str =
        ShapeGuards.isLiteralShape(type) ? JSON.stringify(type.Value) :
        ShapeGuards.isNumberShape(type) ? (value as number).toString(10) :
        ShapeGuards.isTimestampShape(type) ? (value as Date).toISOString() :
        (value as any).toString();

      return yield* vtl(type)`${str}`;
    } catch (err) {
      console.error(err);
      console.log(value);
      throw err;
    }
  }

  export function isLike<T extends Shape>(shape: T, value: any): value is VObject.Like<T> {
    if (VObject.isObject(value)) {

    }
    return (
      ShapeGuards.isBoolShape(shape) ? typeof value === 'boolean' :
      ShapeGuards.isNumberShape(shape) ? typeof value === 'number' :
      ShapeGuards.isStringShape(shape) ? typeof value === 'string' :
      ShapeGuards.isEnumShape(shape) ? typeof value === 'string' && IsInstance.of(shape)(value) :
      ShapeGuards.isNothingShape(shape) ? typeof value === 'undefined' :
      ShapeGuards.isUnionShape(shape) ? shape.Items.find(item => isLike(item, value)) !== undefined :
      ShapeGuards.isMapShape(shape) ?
        typeof value === 'object' &&
        Object.values(value).map(field => isLike(shape.Items, field)).reduce((a, b) => a && b, true) :
      ShapeGuards.isCollectionShape(shape) ?
        Array.isArray(value) &&
        Object.values(value).map(field => isLike(shape.Items, field)).reduce((a, b) => a && b, true) :
      ShapeGuards.isRecordShape(shape) ?
        typeof value === 'object' &&
        Object.entries(shape.Members).map(([name, field]) => isLike(field, value[name])).reduce((a, b) => a && b, false) :
      false
    );
  }

  export function fromExpr<T extends Shape>(type: T, expr: VExpression): VObject.Of<T> {
    const shape: Shape = VObject.isObject(type) ? getType(type) : type as Shape;
    return shape.visit(Visitor.defaultInstance as any, expr) as any;
  }

  const _global = Symbol.for('VObject');
  function _weakMap(): WeakMap<VObject, {
    type: Shape;
    expr: VExpression
  }> {
    const g = global as any;
    if (g[_global] === undefined) {
      g[_global] = new WeakMap();
    }
    return g[_global];
  }

  export function assertIsVObject(a: any): asserts a is VObject {
    if (!_weakMap().has(a)) {
      const err = new Error(`no entry in global weakmap for VObject`);
      console.error('object is not a VObject', a, err);
      throw err;
    }
  }

  export function getType<T extends VObject>(t: T): TypeOf<T> {
    return t[VObjectType] as TypeOf<T>;
  }

  export function getExpr<T extends VObject>(t: T): VExpression {
    return t[VObjectExpr];
  }

  export function NewType<T extends Shape>(type: T): new(expr: VExpression) => VObject<T> {
    return class extends VObject<T> {
      constructor(expr: VExpression) {
        super(type, expr);
      }
    };
  }
  export type TypeOf<T extends VObject> = T extends VObject<infer S> ? S : never;

  export function isObject(a: any): a is VObject {
    return a && a[VObjectExpr] !== undefined;
  }

  export function isList(a: any): a is VList {
    return VObject.isObject(a) && ShapeGuards.isArrayShape(a[VObjectType]);
  }

  // export type ShapeOf<T extends VObject> = T extends VObject<infer I> ? I : never;

  export type Of<T extends Shape> =
    T extends TypeShape ? VRecord<T> & {
      [field in keyof T['Members']]: Of<T['Members'][field]>;
    } :
    T extends ArrayShape<infer I> ? VList<Of<I>> :
    T extends SetShape<infer I> ? VList<Of<I>> :
    T extends MapShape<infer I> ? VMap<Of<I>> : // maps are not supported in GraphQL
    T extends BoolShape ? VBool :
    T extends AnyShape ? VAny :
    T extends IntegerShape ? VInteger :
    T extends NumberShape ? VFloat :
    T extends StringShape ? VString :
    T extends TimestampShape ? VTimestamp :
    T extends UnionShape<infer U> ? VUnion<Of<U[Extract<keyof U, number>]>> :
    T extends NothingShape ? VNothing :
    T extends EnumShape ? VEnum<T> :

    VObject<T>
  ;

  /**
   * Object that is "like" a VObject for some Shape.
   *
   * Like meaning that is either an expression, or a collection
   * of expressions that share the structure of the target type.
   */
  export type Like<T extends Shape> = VObject.Of<T> | Value.Of<T> | (
    T extends TypeShape<infer M> ? {
      [m in keyof M]: Like<M[m]>;
    } :
    T extends ArrayShape<infer I> ? Like<I>[] :
    T extends SetShape<infer I> ? Like<I>[] :
    T extends MapShape<infer I> ? {
      [key: string]: Like<I>;
    } :
    T extends UnionShape<infer I> ? VUnion<VObject.Of<I[Extract<keyof I, number>]>> | {
      [i in Extract<keyof I, number>]: Like<I[i]>;
    }[Extract<keyof I, number>] :
    VObject.Of<T> | Value.Of<T>
  );
}

export const IDTrait = {
  graphqlType: 'ID'
} as const;

export const ID = string.apply(IDTrait);

export class VAny extends VObject.NewType(any) {}

const VNumeric = <N extends NumberShape>(type: N) => class extends VObject.NewType(type) {
  // public multiply(value: VInteger): VTL<> {

  // }

  public *minus(value: VObject.Like<N>): VTL<this> {
    return (yield* stash(VObject.fromExpr(type, VExpression.concat(
      this, ' - ', VObject.isObject(value) ? value : value.toString(10)
    )))) as any as this;
  }

  public toString(): VString {
    return new VString(VExpression.concat(
      '"', this, '"',
    ));
  }
};

export class VInteger extends VNumeric<IntegerShape>(integer) {}
export class VFloat extends VNumeric<NumberShape>(number) {}
export class VNothing extends VObject.NewType(nothing) {}
export class VNever extends VObject.NewType(never) {}
export class VBinary extends VObject.NewType(binary) {}

export class VBool extends VObject.NewType(boolean) {
  public static not(a: VBool): VBool {
    return new VBool(VExpression.concat('!', a));
  }

  public static and(...bs: VBool[]): VBool {
    return VBool.operator('&&', bs);
  }

  public static or(...bs: VBool[]): VBool {
    return VBool.operator('||', bs);
  }

  private static operator(op: '&&' | '||', xs: VBool[]): VBool {
    return new VBool(VExpression.concat(
      '(',
      ...xs
        .map((x, i) => i === 0 ? [x] : [op, x])
        .reduce((a, b) => a.concat(b)),
      ')'
    ));
  }

  public not(): VBool {
    return VBool.not(this);
  }

  public and(x: VBool, ...xs: VBool[]): VBool {
    return VBool.and(this, x, ...xs);
  }

  public or(x: VBool, ...xs: VBool[]): VBool {
    return VBool.or(this, x, ...xs);
  }
}

function cleanArgs(...args: any[]): any[] {
  return args.filter(a => a !== undefined);
}

export interface VString {
  /**
   * Returns a hash code for this string. The hash code for a String object is computed as:
   * ```java
   * s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1]
   * ```
   * using int arithmetic, where s[i] is the ith character of the string, n is the length
   * of the string, and ^ indicates exponentiation. (The hash value of the empty string is zero.)
   */
  hashCode(): VInteger;
}

export class VStringLike<T extends StringShape | EnumShape> extends VObject<T> {
  /**
   * Compares two strings lexicographically. The comparison is based on the Unicode value
   * of each character in the strings. The character sequence represented by this String
   * object is compared lexicographically to the character sequence represented by the
   * argument string. The result is a negative integer if this String object lexicographically
   * precedes the argument string. The result is a positive integer if this String object
   * lexicographically follows the argument string. The result is zero if the strings are
   * equal; compareTo returns `0` exactly when the `equals(Object)` method would return `true`.
   *
   * This is the definition of lexicographic ordering. If two strings are different, then
   * either they have different characters at some index that is a valid index for both
   * strings, or their lengths are different, or both. If they have different characters
   * at one or more index positions, let k be the smallest such index; then the string
   * whose character at position k has the smaller value, as determined by using the `<`
   * operator, lexicographically precedes the other string. In this case, `compareTo`
   * returns the difference of the two character values at position k in the two string
   * -- that is, the value:
   *
   * ```java
   * this.charAt(k)-anotherString.charAt(k)
   * ```
   * If there is no index position at which they differ, then the shorter string lexicographically
   * precedes the longer string. In this case, compareTo returns the difference of the lengths of
   * the strings -- that is, the value:
   * ```java
   * this.length()-anotherString.length()
   * ```
   * @param anotherString the String to be compared.
   * @returns the value `0` if the argument string is equal to this string; a value less
   *          than `0` if this string is lexicographically less than the string argument;
   *          and a value greater than 0 if this string is lexicographically greater
   *          than the string argument.
   */
  public compareTo(anotherString: string | VString): VBool {
    return new VBool(VExpression.call(this, 'compareTo', [anotherString]));
  }

  /**
   * Compares two strings lexicographically, ignoring case differences. This method returns
   * an integer whose sign is that of calling compareTo with normalized versions of the
   * strings where case differences have been eliminated by calling
   * `Character.toLowerCase(Character.toUpperCase(character))`on each character.
   *
   * Note that this method does not take locale into account, and will result in an
   * unsatisfactory ordering for certain locales. The `java.text` package provides collators
   * to allow locale-sensitive ordering.
   *
   * @param anotherString the String to be compared.
   * @returns a negative integer, zero, or a positive integer as the specified String
   *          is greater than, equal to, or less than this String, ignoring case considerations.
   */
  public compareToIgnoreCase(anotherString: string | VString): VBool {
    return new VBool(VExpression.call(this, 'compareToIgnoreCase', [anotherString]));
  }
  /**
   * Concatenates the specified string to the end of this string.
   * If the length of the argument string is 0, then this String object is returned.
   * Otherwise, a new String object is created, representing a character sequence
   * that is the concatenation of the character sequence represented by this String
   * object and the character sequence represented by the argument string.
   *
   * Examples:
   * ```
   * "cares".concat("s") // returns "caress"
   * "to".concat("get").concat("her") // returns "together"
   * ```
   * @param str the String that is concatenated to the end of this String.
   * @returns a string that represents the concatenation of this object's characters
   *          followed by the string argument's characters.
   */
  public concat(str: string | VString): VString {
    return new VString(VExpression.call(this, 'concat', [str]));
  }
  /**
   * Tests if this string ends with the specified suffix.
   * @param suffix the suffix.
   * @returns true if the character sequence represented by the argument is a suffix
   *          of the character sequence represented by this object; false otherwise.
   *          Note that the result will be true if the argument is the empty string
   *          or is equal to this String object as determined by the `equals(Object)`
   *          method.
   */
  public endsWith(suffix: string | VString): VBool {
    return new VBool(VExpression.call(this, 'endsWith', [suffix]));
  }

  /**
   * Compares this String to another String, ignoring case considerations. Two strings
   * are considered equal ignoring case if they are of the same length and corresponding
   * characters in the two strings are equal ignoring case.
   *
   * Two characters `c1` and `c2` are considered the same ignoring case if at least one of
   * the following is true:
   *
   * - The two characters are the same (as compared by the `==` operator)
   * - Applying the method `Character.toUpperCase(char)` to each character produces the same result
   * - Applying the method `Character.toLowerCase(char)` to each character produces the same result
   *
   * @param anotherString The String to compare this String against
   * @returns `true` if the argument is not `null` and it represents an equivalent String ignoring case; `false` otherwise
   */
  public equalsIgnoreCase(anotherString: string | VString): VBool {
    return new VBool(VExpression.call(this, 'equalsIgnoreCase', [anotherString]));
  }

  /**
   * Returns the index within this string of the first occurrence of the specified
   * substring, starting at the specified index. The integer returned is the
   * smallest value k for which:
   *
   * ```java
   * k >= Math.min(fromIndex, this.length()) && this.startsWith(str, k)
   * ```
   *
   * If no such value of k exists, then -1 is returned.
   * @param str the substring for which to search.
   * @param fromIndex the index from which to start the search.
   * @returns the index within this string of the first occurrence of the specified
   *          substring, starting at the specified index.
   */
  public indexOf(str: string | VString, fromIndex?: number | VInteger): VInteger {
    return new VInteger(VExpression.call(this, 'indexOf', cleanArgs(str, fromIndex)));
  }
  /**
   * Returns `true` if, and only if, `length()` is `0`.
   */
  public isEmpty(): VBool {
    return new VBool(VExpression.concat(this, '.isEmpty()'));
  }
  /**
   * Returns the index within this string of the last occurrence of the specified character,
   * searching backward starting at the specified index.
   *
   * ```java
   * k >= Math.min(fromIndex, this.length()) && this.startsWith(str, k)
   * ```
   *
   * If no such value of k exists, then -1 is returned.
   * @param str the substring to search for
   * @param fromIndex the index to start the search from.
   */
  public lastIndexOf(str: string | VString, fromIndex?: number | VInteger): VInteger {
    return new VInteger(VExpression.call(
      this, 'substring', cleanArgs(str, fromIndex)));
  }
  /**
   * Returns the length of this string.
   */
  public length(): VInteger {
    return new VInteger(VExpression.concat(this, '.length()'));
  }
  /**
   * Tells whether or not this string matches the given regular expression.
   *
   * An invocation of this method of the form str.matches(regex) yields exactly the same result as the expression
   * @param regex the regular expression to which this string is to be matched
   * @returns `true` if, and only if, this string matches the given regular expression
   */
  public matches(regex: string | RegExp | VString): VBool {
    return new VBool(VExpression.call(
      this, 'matches', [
        typeof regex !== 'string' && !VObject.isObject(regex) ? (regex as RegExp).source : regex
      ]));
  }
  /**
   * Splits this string around matches of the given regular expression.
   *
   * The array returned by this method contains each substring of this string that is
   * terminated by another substring that matches the given expression or is terminated
   * by the end of the string. The substrings in the array are in the order in which
   * they occur in this string. If the expression does not match any part of the input
   * then the resulting array has just one element, namely this string.
   *
   * The limit parameter controls the number of times the pattern is applied and therefore
   * affects the length of the resulting array. If the limit n is greater than zero then
   * the pattern will be applied at most n - 1 times, the array's length will be no greater
   * than n, and the array's last entry will contain all input beyond the last matched
   * delimiter. If n is non-positive then the pattern will be applied as many times as
   * possible and the array can have any length. If n is zero then the pattern will be
   * applied as many times as possible, the array can have any length, and trailing empty
   * strings will be discarded.
   *
   * The string `"boo:and:foo"`, for example, yields the following results with these parameters:
   * ```
   * Regex	Limit	Result
   * :	    2	    { "boo", "and:foo" }
   * :	    5	    { "boo", "and", "foo" }
   * :	    -2	   { "boo", "and", "foo" }
   * o	    5	    { "b", "", ":and:f", "", "" }
   * o	    -2	   { "b", "", ":and:f", "", "" }
   * o	    0	    { "b", "", ":and:f" }
   * ```
   *
   * @param regex the delimiting regular expression
   * @param limit the result threshold, as described above
   * @returns the array of strings computed by splitting this string around matches of the given regular expression
   */
  public split(regex: string | RegExp | VString, limit?: number | VInteger): VList<VString> {
    return new VList(string, VExpression.call(
      this, 'split', cleanArgs(
        typeof regex !== 'string' && !VObject.isObject(regex) ? (regex as RegExp).source : regex,
        limit
    )));
  }
  /**
   * Returns a new string that is a substring of this string. The substring begins
   * at the specified beginIndex and extends to the character at index endIndex - 1.
   * Thus the length of the substring is endIndex-beginIndex.
   *
   * @param beginIndex the beginning index, inclusive.
   * @param endIndex the ending index, exclusive.
   * @returns the specified substring.
   */
  public substring(beginIndex: VObject.Like<IntegerShape>, endIndex?: VObject.Like<IntegerShape>): VString {
    return new VString(VExpression.call(
      this, 'substring', cleanArgs(beginIndex, endIndex)));
  }
  /**
   * Tests if the substring of this string beginning at the specified index starts with the specified prefix.
   *
   * @param prefix the prefix.
   * @param toffset true if the character sequence represented by the argument is a prefix of the
   *                character sequence represented by this string; false otherwise. Note also
   *                that true will be returned if the argument is an empty string or is equal to
   *                this String object as determined by the equals(Object) method.
   * @returns true if the character sequence represented by the argument is a prefix of the substring
   *          of this object starting at index toffset; false otherwise. The result is false if toffset
   *          is negative or greater than the length of this String object; otherwise the result is the
   *          same as the result of the expression
   */
  public startsWith(prefix: string | VString, toffset?: number | VInteger): VBool {
    return new VBool(VExpression.call(
      this, 'startsWith', [
        prefix,
        ...(toffset === undefined ? [] : [])
      ]
    ));
  }
  /**
   * Converts all of the characters in this String to lower case using the rules of the default locale.
   */
  public toLowerCase(): VString {
    return new VString(VExpression.concat(this, '.toLowerCase()'));
  }
  /**
   * Converts all of the characters in this String to upper case using the rules of the default locale.
   */
  public toUpperCase(): VString {
    return new VString(VExpression.concat(this, '.toUpperCase()'));
  }
  /**
   * Returns a copy of the string, with leading and trailing whitespace omitted.
   */
  public trim(): VString {
    return new VString(VExpression.concat(this, '.trim()'));
  }
}

export class VString extends VStringLike<StringShape> {
  constructor(expr: VExpression) {
    super(string, expr);
  }
}

export class VEnum<E extends EnumShape> extends VStringLike<E> {}

export class VTimestamp extends VObject.NewType(timestamp) {}

export class VList<T extends VObject = VObject> extends VObject<ArrayShape<VObject.TypeOf<T>>> {
  constructor(shape: VObject.TypeOf<T>, expression: VExpression) {
    super(array(shape), expression);
  }

  public size(): VInteger {
    return new VInteger(VExpression.concat(this, '.size()'));
  }

  public isEmpty(): VBool {
    return new VBool(VExpression.concat(this, '.isEmpty()'));
  }

  public get(index: number | VInteger): T {
    return VObject.fromExpr(VObject.getType(this).Items, VExpression.concat(this, '.get(', index, ')')) as any;
  }

  public *set(index: number | VInteger, value: VObject.Like<VObject.TypeOf<T>>): VTL<void> {
    yield* vtl`$util.qr(${this}.set(${index}, ${yield* VObject.of(VObject.getType(this).Items, value)}))`;
  }

  public push(value: VObject.Like<VObject.TypeOf<T>>) {
    return this.add(value);
  }

  public *add(value: VObject.Like<VObject.TypeOf<T>>): VTL<void> {
    yield* vtl`$util.qr(${this}.add(${yield* VObject.of(VObject.getType(this).Items, value)}))`;
  }

  public *forEach(f: (item: T, index: VInteger) => VTL<void>): VTL<void> {
    yield* forLoop(this, f as any);
  }
}

export class VMap<T extends VObject = VObject> extends VObject<MapShape<VObject.TypeOf<T>>> {
  constructor(shape: MapShape<VObject.TypeOf<T>>, expression: VExpression) {
    super(shape, expression);
  }

  public values(): VList<T> {
    return new VList(VObject.getType(this).Items, VExpression.concat(this, '.values()'));
  }

  public get(key: string | VString): T {
    return VObject.fromExpr(VObject.getType(this).Items, VExpression.concat(
      this, '.get("', key, '")'
    )) as any as T;
  }

  public *put(key: string | VString, value: T): VTL<void> {
    yield* vtl(nothing)`$util.qr(${this}.put(${key}, ${value}))`;
  }
}

export class VRecord<T extends TypeShape = TypeShape> extends VObject<T> {
  constructor(type: T, expr: VExpression) {
    super(type, expr);
    for (const [name, shape] of Object.entries(type.Members) as [string, Shape][]) {
      (this as any)[name] = VObject.fromExpr(shape, VExpression.concat(expr, '.', name.startsWith('_') ? `get("${name}")` : name));
    }
  }
}
export namespace VRecord {
  export type GetMembers<R extends VRecord> = R extends VRecord<infer M> ? M : any;
  export interface Members {
    [m: string]: VObject;
  }
  export type Class<T extends VRecord = any> = (new(members: VRecord.GetMembers<T>) => T);
}

export class VUnion<U extends VObject> extends VObject<UnionShape<VObject.TypeOf<U>[]>> {
  public *assertIs<T extends VUnion.UnionCase<U>>(item: T, msg?: string | VString): VTL<VObject.Of<T>, any> {
    return yield* this.match(item, function*(i) {
      return i;
    }).otherwise(function*() {
      throw $util.error(msg || `Item must be of type: ${item.Kind}`);
    }) as any as VTL<VObject.Of<T>, any>;
  }

  public match<T, M extends VUnion.UnionCase<U>>(
    match: M,
    then: VUnion.CaseBlock<M, T>
  ): VUnion.Match<U, T | undefined, M> {
    return new VUnion.Match(undefined, this, match, then);
  }
}
export namespace VUnion {
  export type CaseBlock<I extends Shape, T> = (i: VObject.Of<I>) => Generator<any, T>;
  export type OtherwiseBlock<T> = () => Generator<any, T>;
  export type UnionCase<U extends VObject> = VObject.TypeOf<U>;

  export class Match<
    U extends VObject = VObject,
    Returns = any,
    Excludes = UnionCase<U>
  > {
    constructor(
      public readonly parent: Match<U, any, any> | undefined,
      public readonly value: VObject<Shape>,
      public readonly matchType: VUnion.UnionCase<U>,
      public readonly block: VUnion.CaseBlock<any, Returns>
    ) {}

    public [Symbol.iterator](): Generator<any, Returns, unknown> {
      return parseMatch(this as any as Match);
    }

    public match<
      M extends Exclude<
        VObject.TypeOf<U>,
        Excludes
      >,
      T
    >(
      match: M,
      then: CaseBlock<M, T>
    ): Match<
      U,
      T | Returns | undefined,
      M | Excludes
    > {
      return new Match(this, this.value, match as any, then);
    }

    public otherwise<T>(
      block: OtherwiseBlock<T>
    ): VTL<
      | T
      | Exclude<Returns, undefined> extends never ?
        Returns :
        Exclude<Returns, undefined>
    > {
      return new Otherwise(this, block as any) as any;
    }
  }

  export class Otherwise<Returns = any> {
    constructor(
      public readonly parent: Match<any, Returns, any>,
      public readonly block: VUnion.OtherwiseBlock<Returns>
    ) {}

    public [Symbol.iterator](): Generator<any, Returns, unknown> {
      return parseMatch(this.parent, new ElseBranch(this.block));
    }
  }

  function parseMatch(m: Match, elseIf?: IfBranch | ElseBranch): Generator<any, any> {
    const assertCondition = toCondition(m);
    const assertedValue = VObject.fromExpr(m.matchType, VObject.getExpr(m.value));
    return (function*() {
      const branch = new IfBranch(assertCondition, () => m.block(assertedValue), elseIf);
      if (m.parent) {
        yield* parseMatch(m.parent, branch);
      } else {
        return yield branch;
      }
    })();
  }

  function toCondition(m: Match): VBool {
    const shape = m.matchType;
    const type = $util.typeOf(m.value);

    const s =
      ShapeGuards.isTimestampShape(shape) ? 'String' :
      ShapeGuards.isStringShape(shape) ? 'String' :
      ShapeGuards.isNumberShape(shape) ? 'Number' :
      ShapeGuards.isNothingShape(shape) ? 'Null' :
      ShapeGuards.isArrayShape(shape) ? 'List' :
      ShapeGuards.isSetShape(shape) ? 'List' :
      ShapeGuards.isBoolShape(shape) ? 'Boolean' :
      ShapeGuards.isRecordShape(shape) ? 'Map' :
      ShapeGuards.isMapShape(shape) ? 'Map' :
      undefined
    ;
    if (s === undefined) {
      throw new Error(`cannot match on type: ${shape.Kind}`);
    }

    return type.equals(s as string);
  }
}

export class Visitor implements ShapeVisitor<VObject, VExpression> {
  public static defaultInstance = new Visitor();

  public enumShape(shape: EnumShape<any, any>, expr: VExpression): VEnum<EnumShape> {
    return new VEnum(shape, expr);
  }
  public unionShape(shape: UnionShape<Shape[]>, expr: VExpression): VUnion<VObject<Shape>> {
    return new VUnion(shape, expr);
  }
  public literalShape(shape: LiteralShape<Shape, any>, expr: VExpression): VObject<Shape> {
    return shape.Type.visit(this, expr);
  }
  public functionShape(shape: FunctionShape<FunctionArgs, Shape>): VObject<Shape> {
    throw new Error("Method not implemented.");
  }
  public neverShape(shape: NeverShape, expr: VExpression): VObject<Shape> {
    return new VNever(expr);
  }
  public arrayShape(shape: ArrayShape<any>, expr: VExpression): VList {
    return new VList(shape.Items, expr);
  }
  public binaryShape(shape: BinaryShape, expr: VExpression): VBinary {
    return new VBinary(expr);
  }
  public boolShape(shape: BoolShape, expr: VExpression): VBool {
    return new VBool(expr);
  }
  public recordShape(shape: TypeShape<any>, expr: VExpression): VRecord {
    return new VRecord(shape, expr);
  }
  public anyShape(shape: AnyShape, expr: VExpression): VAny {
    return new VAny(expr);
  }
  public integerShape(shape: IntegerShape, expr: VExpression): VInteger {
    return new VInteger(expr);
  }
  public mapShape(shape: MapShape<Shape>, expr: VExpression): VMap<VObject> {
    return new VMap(shape, expr);
  }
  public nothingShape(shape: NothingShape, expr: VExpression): VNothing {
    return new VNothing(expr);
  }
  public numberShape(shape: NumberShape, expr: VExpression): VFloat {
    return new VFloat(expr);
  }
  public setShape(shape: SetShape<Shape>, expr: VExpression): VList<VObject> {
    return new VList(shape, expr);
  }
  public stringShape(shape: StringShape, expr: VExpression): VString {
    return new VString(expr);
  }
  public timestampShape(shape: TimestampShape, expr: VExpression): VTimestamp {
    return new VTimestamp(expr);
  }
}
