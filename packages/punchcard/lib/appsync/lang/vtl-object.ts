import { any, AnyShape, array, binary, BinaryShape, bool, boolean, integer, LiteralShape, never, NeverShape, nothing, NothingShape, number, ShapeGuards, ShapeVisitor, timestamp, unknown, UnknownShape, Value } from '@punchcard/shape';
import { ArrayShape, BoolShape, DynamicShape, IntegerShape, MapShape, NumberShape, Pointer, RecordShape, SetShape, Shape, StringShape, TimestampShape } from '@punchcard/shape';
import { string, Trait } from '@punchcard/shape';
import { FunctionArgs, FunctionShape } from '@punchcard/shape/lib/function';
import { UnionShape } from '@punchcard/shape/lib/union';
import { VExpression } from './expression';
import { ElseBranch, IfBranch, setVariable } from './statement';
import { $else, $elseIf, $if } from './syntax';
import { $util } from './util';
import { VTL, vtl } from './vtl';

const type = Symbol.for('GraphQL.Type');
const expr = Symbol.for('GraphQL.Expression');

export class VObject<T extends Shape = Shape> {
  public static readonly Type = type;
  public static readonly Expr = expr;

  public static typeOf<T extends VObject>(t: T): T[typeof type] {
    return t[type];
  }

  public static exprOf<T extends VObject>(t: T): T[typeof expr] {
    return t[expr];
  }

  public readonly [type]: T;
  public readonly [expr]: VExpression;
  constructor(_type: T, _expr: VExpression) {
    this[type] = _type;
    this[expr] = _expr;
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
      this,
      '==',
      VObject.isObject(other) ? other : VExpression.json(other)
    ));
  }

  public toJson(): VString {
    return new VString(new VExpression(ctx => `$util.toJson(${VObject.exprOf(this).visit(ctx)})`));
  }
}

export namespace VObject {
  export function NewType<T extends Shape>(type: T): new(expr: VExpression) => VObject<T> {
    return class extends VObject<T> {
      constructor(expr: VExpression) {
        super(type, expr);
      }
    };
  }
  export type TypeOf<T extends VObject> = T[typeof type];

  export function isObject(a: any): a is VObject {
    return a[expr] !== undefined;
  }

  // export type ShapeOf<T extends VObject> = T extends VObject<infer I> ? I : never;

  export type Of<T extends Shape> =
    T extends RecordShape<infer M> ? VRecord<{
      [m in keyof M]: Of<M[m]>;
    }> & {
      [m in keyof M]: Of<M[m]>;
    } :
    T extends ArrayShape<infer I> ? VList<I> :
    T extends SetShape<infer I> ? VSet<VObject.Of<I>> :
    T extends MapShape<infer I> ? VMap<VObject.Of<I>> : // maps are not supported in GraphQL
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
      [m in keyof M]: Like<Pointer.Resolve<M[m]>>;
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
    return (yield* setVariable(VObject.of(type, VExpression.concat(
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

  public *add(value: VObject.Like<T>): VTL<void> {}
}

export class VSet<T extends VObject = VObject> extends VObject<SetShape<VObject.TypeOf<T>>> {
  constructor(shape: SetShape<VObject.TypeOf<T>>, expression: VExpression) {
    super(shape, expression);
  }
}

export class VMap<T extends VObject = VObject> extends VObject<MapShape<VObject.TypeOf<T>>> {
  constructor(shape: MapShape<VObject.TypeOf<T>>, expression: VExpression) {
    super(shape, expression);
  }

  public get(key: string | VString): T {
    return VObject.of(this[type].Items, VExpression.concat(
      this,
      '.get(',
      key,
      ')'
    )) as any as T;
  }

  public *put(key: string | VString, value: VObject.Of<VObject.TypeOf<T>>): VTL<void> {
    yield* vtl(nothing)`$util.qr(${this}.put(${key}, ${value}))`;
  }
}

export class VRecord<M extends VRecord.Members = {}> extends VObject<RecordShape<{
  [m in keyof M]: M[m][typeof type];
}>> {
  constructor(type: RecordShape<any, any>, expr: VExpression) {
    super(type, expr);
    for (const [name, shape] of Object.entries(type.Members) as [string, Shape][]) {
      (this as any)[name] = VObject.of(shape, VExpression.concat(expr, '.', name));
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

export class VUnion<U extends UnionShape<Shape[]>> extends VObject<U> {
  constructor(type: U, expr: VExpression) {
    super(type, expr);
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
  export type UnionCase<U extends UnionShape<Shape[]>> = U['Items'][Extract<keyof U['Items'], number>];


  function toCondition(m: Match | Otherwise): VBool {
    const shape = VObject.typeOf(m.value);
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

  function parseMatch(m: Match, elseIf: IfBranch | ElseBranch): Generator<any, any> {
    const assertCondition = toCondition(m);
    const assertedValue = VObject.of(m.matchType, VObject.exprOf(m.value));
    return m.parent === undefined ?
      $if(assertCondition, () => m.block(assertedValue), elseIf) :
      parseMatch(m.parent, $elseIf(assertCondition, () => m.block(assertedValue), elseIf))
    ;
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
    U extends UnionShape<Shape[]> = UnionShape<Shape[]>,
    Returns = any,
    Excludes extends UnionCase<U> = UnionCase<U>
  > implements Generator<any, Returns> {
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
      return parseMatch(this.parent, $elseIf(this.block));
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
  public unionShape(shape: UnionShape<Shape[]>, expr: VExpression): VObject<Shape> {
    throw new Error("Method not implemented.");
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
  public mapShape(shape: MapShape<Shape>, expr: VExpression): never {
    throw new Error(`map is not supported by GraphQL`);
  }
  public nothingShape(shape: NothingShape, expr: VExpression): VNothing {
    throw new VNothing(expr);
  }
  public numberShape(shape: NumberShape, expr: VExpression): VFloat {
    // tslint:disable-next-line: no-construct
    return new VFloat(expr);
  }
  public setShape(shape: SetShape<Shape>, expr: VExpression): VSet<VObject> {
    return new VSet(shape, expr);
  }
  public stringShape(shape: StringShape, expr: VExpression): VString {
    // tslint:disable-next-line: no-construct
    return new VString(expr);
  }
  public timestampShape(shape: TimestampShape, expr: VExpression): VTimestamp {
    return new VTimestamp(expr);
  }
}
