import { any, array, binary, BinaryShape, boolean, integer, LiteralShape, never, NeverShape, nothing, NothingShape, number, ShapeGuards, ShapeVisitor, timestamp, unknown, Value } from '@punchcard/shape';
import { ArrayShape, BoolShape, DynamicShape, IntegerShape, MapShape, NumberShape, RecordShape, SetShape, Shape, StringShape, TimestampShape } from '@punchcard/shape';
import { string, Trait } from '@punchcard/shape';
import { FunctionArgs, FunctionShape } from '@punchcard/shape/lib/function';
import { UnionShape } from '@punchcard/shape/lib/union';
import { VExpression } from './expression';
import { ElseBranch, IfBranch, setVariable } from './statement';
import { $else, $elseIf, $if } from './syntax';
import { $util } from './util';
import { VTL, vtl } from './vtl';

export const VObjectType = Symbol.for('VObjectType');
export const VObjectExpr = Symbol.for('VObjectExpr');

export class VObject<T extends Shape = Shape> {
  public readonly [VObjectType]: T;
  public readonly [VObjectExpr]: VExpression;
  constructor(_type: T, _expr: VExpression) {
    this[VObjectType] = _type;
    this[VObjectExpr] = _expr;
  }

  public as<T extends Shape>(t: T): VObject.Of<T> {
    return VObject.ofExpression(t, this[VObjectExpr]);
  }

  public notEquals(other: this | Value.Of<T>): VBool {
    return new VBool(VExpression.concat(
      this,
      '!=',
      VObject.isObject(other) ? other : VExpression.json(other)
    ));
  }

  public equals(other: this | Value.Of<T>): VBool {
    return new VBool(VExpression.concat(
      this, '==', VObject.isObject(other) ? other : VExpression.json(other)
    ));
  }
}

export namespace VObject {
  export function *of<T extends Shape>(type: T, value: VObject.Like<T>): VTL<VObject.Of<T>> {
    if (ShapeGuards.isDynamicShape(type)) {
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
      for (const [fieldName, fieldType] of Object.entries(type.Members)) {
        const fieldValue = (value as any)[fieldName];
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
        return VObject.ofExpression(type as T, itemValue[VObjectExpr]) as VObject.Of<T>;
      }
      throw new Error(`value did not match item in the UnionShape: ${type.Items.map(i => i.Kind).join(',')}`);
    }

    // stringify primitives
    const str =
      ShapeGuards.isLiteralShape(type) ? JSON.stringify(type.Value) :
      ShapeGuards.isNumberShape(type) ? (value as number).toString(10) :
      ShapeGuards.isTimestampShape(type) ? (value as Date).toISOString() :
      (value as any).toString();

    return yield* vtl(type)`${str}`;
  }

  export function isLike<T extends Shape>(shape: T, value: any): value is VObject.Like<T> {
    if (VObject.isObject(value)) {

    }
    return (
      ShapeGuards.isBoolShape(shape) ? typeof value === 'boolean' :
      ShapeGuards.isNumberShape(shape) ? typeof value === 'number' :
      ShapeGuards.isStringShape(shape) ? typeof value === 'string' :
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

  export function ofExpression<T extends Shape>(type: T, expr: VExpression): VObject.Of<T> {
    const shape: Shape = VObject.isObject(type) ? getType(type) : type as Shape;
    return shape.visit(Visitor.defaultInstance as any, expr) as any;
  }

  export function getType<T extends VObject>(t: T): T[typeof VObjectType] {
    return t[VObjectType];
  }

  export function getExpression<T extends VObject>(t: T): VExpression {
    return t[VObjectExpr];
  }

  export function NewType<T extends Shape>(type: T): new(expr: VExpression) => VObject<T> {
    return class extends VObject<T> {
      constructor(expr: VExpression) {
        super(type, expr);
      }
    };
  }
  export type TypeOf<T extends VObject> = T[typeof VObjectType];

  export function isObject(a: any): a is VObject {
    return a[VObjectExpr] !== undefined;
  }

  // export type ShapeOf<T extends VObject> = T extends VObject<infer I> ? I : never;

  export type Of<T extends Shape> =
    T extends RecordShape ? VRecord<T> & {
      [field in keyof T['Members']]: Of<T['Members'][field]>;
    } :
    T extends ArrayShape<infer I> ? VList<I> :
    T extends SetShape<infer I> ? VSet<I> :
    T extends MapShape<infer I> ? VMap<I> : // maps are not supported in GraphQL
    T extends BoolShape ? VBool :
    T extends DynamicShape<any> ? VAny :
    T extends IntegerShape ? VInteger :
    T extends NumberShape ? VFloat :
    T extends StringShape ? VString :
    T extends TimestampShape ? VTimestamp :
    T extends UnionShape<infer U> ? VUnion<T> :

    VObject<T>
  ;

  /**
   * Object that is "like" a VObject for some Shape.
   *
   * Like meaning that is either an expression, or a collection
   * of expressions that share the structure of the target type.
   */
  export type Like<T extends Shape> = Value.Of<T> | VObject.Of<T> | (
    T extends RecordShape<infer M> ? {
      [m in keyof M]: Like<M[m]>;
    } :
    T extends ArrayShape<infer I> ? Like<I>[] :
    T extends SetShape<infer I> ? Like<I>[] :
    T extends MapShape<infer I> ? {
      [key: string]: Like<I>;
    } :
    T extends UnionShape<infer I> ? {
      [i in Extract<keyof I, number>]: Like<I[i]>;
    }[Extract<keyof I, number>] :
    VObject.Of<T> | Value.Of<T>
  );
}

export const IDTrait: {
  [Trait.Data]: {
    graphqlType: 'ID'
  }
} = {
  [Trait.Data]: {
    graphqlType: 'ID'
  }
};

export const ID = string.apply(IDTrait);

export class VAny extends VObject.NewType(any) {}
export class VUnknown extends VObject.NewType(unknown) {}

const VNumeric = <N extends NumberShape>(type: N) => class extends VObject.NewType(type) {
  public *minus(value: VObject.Like<N>): VTL<this> {
    return (yield* setVariable(VObject.ofExpression(type, VExpression.concat(
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

export class VString extends VObject.NewType(string) {
  public toUpperCase(): VString {
    return new VString(VExpression.concat(this, '.toUpperCase()'));
  }

  public isNotEmpty(): VBool {
    return VBool.not(this.isEmpty());
  }

  public isEmpty(): VBool {
    return new VBool(VExpression.concat(this, '.isEmpty()'));
  }

  public size(): VInteger {
    return new VInteger(VExpression.concat(this, '.size()'));
  }
}

export class VTimestamp extends VObject.NewType(timestamp) {}

export class VList<T extends Shape = Shape> extends VObject<ArrayShape<T>> {
  constructor(shape: T, expression: VExpression) {
    super(array(shape), expression);
  }

  public *get(index: number | VInteger): VTL<VObject.Of<T>> {
    return yield* vtl(this[VObjectType].Items)`${this}.get(${index})`;
  }

  public *add(value: VObject.Like<T>) {
    yield* vtl`$util.qr(${this}.add(${yield* VObject.of(this[VObjectType].Items, value)}))`;
  }
}

export class VSet<T extends Shape = Shape> extends VObject<SetShape<T>> {
  constructor(shape: SetShape<T>, expression: VExpression) {
    super(shape, expression);
  }

  public *has(value: VObject.Like<T>): VTL<VBool> {
    const itemType = this[VObjectType].Items;
    return yield* vtl(boolean)`${this}.get(${yield* VObject.of(itemType, value)})`;
  }

  public *add(value: VObject.Like<T>) {
    yield* vtl`$util.qr(${this}.add(${yield* VObject.of(this[VObjectType].Items, value)}))`;
  }
}

export class VMap<T extends Shape = Shape> extends VObject<MapShape<T>> {
  constructor(shape: MapShape<T>, expression: VExpression) {
    super(shape, expression);
  }

  public get(key: string | VString): VObject.Of<T> {
    return VObject.ofExpression(this[VObjectType].Items, VExpression.concat(
      this, '.get(', key, ')'
    )) as VObject.Of<T>;
  }

  public *put(key: string | VString, value: VObject.Of<T>): VTL<void> {
    yield* vtl(nothing)`$util.qr(${this}.put(${key}, ${value}))`;
  }
}

export class VRecord<T extends RecordShape = RecordShape> extends VObject<T> {
  constructor(type: T, expr: VExpression) {
    super(type, expr);
    for (const [name, shape] of Object.entries(type.Members) as [string, Shape][]) {
      (this as any)[name] = VObject.ofExpression(shape, VExpression.concat(expr, '.', name));
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

export class VUnion<U extends UnionShape<ArrayLike<Shape>>> extends VObject<U> {
  constructor(type: U, expr: VExpression) {
    super(type, expr);

    // // VUnion needs to behave like all the other shapes simultaneously
    // // we will proxy methods and introspect values to emulate the behavior
    // // of the other shapes
    // return new Proxy(this, {

    // })
  }

  public *assertIs<T extends VUnion.UnionCase<U>>(item: T, msg?: string | VString): VTL<VObject.Of<T>, any> {
    return yield* this.match(item, function*(i) {
      return i;
    }).otherwise(function*() {
      throw $util.error(msg || `Item must be of type: ${item.Kind}`);
    }) as any as VTL<VObject.Of<T>, any>;
  }

  public match<T, I extends VUnion.UnionCase<U>>(
    match: I,
    then: VUnion.CaseBlock<I, T>
  ): VUnion.Match<U, T | undefined, I> {
    return new VUnion.Match(undefined, this, match, then);
  }
}
export namespace VUnion {
  export type CaseBlock<I extends Shape, T> = (i: VObject.Of<I>) => Generator<any, T>;
  export type OtherwiseBlock<T> = () => Generator<any, T>;
  export type UnionCase<U extends UnionShape<ArrayLike<Shape>>> = U['Items'][Extract<keyof U['Items'], number>];

  function toCondition(m: Match | Otherwise): VBool {
    const shape = VObject.getType(m.value);
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

  function parseMatch(m: Match, elseIf?: IfBranch | ElseBranch): Generator<any, any> {
    const assertCondition = toCondition(m);
    const assertedValue = VObject.ofExpression(m.matchType, VObject.getExpression(m.value));
    if (elseIf) {
      return m.parent === undefined ?
        $if(assertCondition, () => m.block(assertedValue), elseIf) :
        parseMatch(m.parent, $elseIf(assertCondition, () => m.block(assertedValue), elseIf))
      ;
    } else {
      return m.parent === undefined ?
        $if(assertCondition, () => m.block(assertedValue)) :
        parseMatch(m.parent, $elseIf(assertCondition, () => m.block(assertedValue)))
      ;
    }
  }

  export class Otherwise<Returns = any> implements Generator<any, Returns> {
    private _generator: Generator;

    constructor(
      public readonly parent: Match<any, Returns, any>,
      public readonly value: VObject<Shape>,
      public readonly block: VUnion.OtherwiseBlock<Returns>
    ) {}

    public get generator() {
      if (!this._generator) {
        this._generator = this[Symbol.iterator]();
      }
      return this._generator;
    }

    public next(...args: [] | [any]): IteratorResult<any, Returns> {
      return this.generator.next(...args);
    }
    public return(value: Returns): IteratorResult<any, Returns> {
      return this.generator.return(value);
    }
    public throw(e: any): IteratorResult<any, Returns> {
      return this.generator.throw(e);
    }
    public [Symbol.iterator](): Generator<any, Returns, unknown> {
      return parseMatch(this.parent, $else(this.block));
    }
  }

  export class Match<
    U extends UnionShape<ArrayLike<Shape>> = UnionShape<ArrayLike<Shape>>,
    Returns = any,
    Excludes extends UnionCase<U> = UnionCase<U>
  > implements VTL<Returns, any> {
    private _generator: Generator<any, Returns>;

    constructor(
      public readonly parent: Match<U, any, any> | undefined,
      public readonly value: VObject<Shape>,
      public readonly matchType: VUnion.UnionCase<U>,
      public readonly block: VUnion.CaseBlock<any, Returns>
    ) {}

    public get generator() {
      if (!this._generator) {
        this._generator = this[Symbol.iterator]();
      }
      return this._generator;
    }

    public next(...args: [] | [any]): IteratorResult<any, Returns> {
      return this.generator.next(...args);
    }
    public return(value: Returns): IteratorResult<any, Returns> {
      return this.generator.return(value);
    }
    public throw(e: any): IteratorResult<any, Returns> {
      return this.generator.throw(e);
    }
    public [Symbol.iterator](): Generator<any, Returns, unknown> {
      return parseMatch(this as any as Match);
    }

    public match<
      T,
      I extends Exclude<
        U['Items'][Extract<keyof U['Items'], number>],
        Exclude<Excludes, never>
      >
    >(
      match: I,
      then: CaseBlock<I, T>
    ): Match<
      U,
      T | Returns | undefined,
      I | Excludes
    > {
      return new Match(this, this.value, match, then);
    }

    public otherwise<T>(
      block: OtherwiseBlock<T>
    ): VTL<
      | T
      | Exclude<Returns, undefined> extends never ?
        Returns :
        Exclude<Returns, undefined>
    > {
      return null as any;
    }
  }
}

export class Visitor implements ShapeVisitor<VObject, VExpression> {
  public static defaultInstance = new Visitor();
  public unionShape(shape: UnionShape<ArrayLike<Shape>>, expr: VExpression): VObject<Shape> {
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
  public recordShape(shape: RecordShape<any>, expr: VExpression): VRecord {
    return new VRecord(shape, expr);
  }
  public dynamicShape(shape: DynamicShape<any>, expr: VExpression): VAny | VUnknown {
    if (shape.Tag === 'any') {
      return new VAny(expr);
    } else {
      return new VUnknown(expr);
    }
  }
  public integerShape(shape: IntegerShape, expr: VExpression): VInteger {
    return new VInteger(expr);
  }
  public mapShape(shape: MapShape<Shape>, expr: VExpression): VMap<Shape> {
    return new VMap(shape, expr);
  }
  public nothingShape(shape: NothingShape, expr: VExpression): VNothing {
    throw new VNothing(expr);
  }
  public numberShape(shape: NumberShape, expr: VExpression): VFloat {
    return new VFloat(expr);
  }
  public setShape(shape: SetShape<Shape>, expr: VExpression): VSet<Shape> {
    return new VSet(shape, expr);
  }
  public stringShape(shape: StringShape, expr: VExpression): VString {
    return new VString(expr);
  }
  public timestampShape(shape: TimestampShape, expr: VExpression): VTimestamp {
    return new VTimestamp(expr);
  }
}
