import { array, ArrayShape, boolean, BoolShape, integer, IntegerShape, MakeRecordInstance, NothingShape, NumberShape, NumericShape, RecordShape, RecordType, Shape, ShapeOrRecord, StringShape, Value } from '@punchcard/shape';
import { VTLVisitor } from './visitor';

const namespace = '@punchcard/shape-velocity-templates';

/**
 * Velocity Template Language (VTL) Domain-Specific Language.
 */
export namespace VTL {
  export type Instance = typeof Instance;
  export const Instance = Symbol.for(`${namespace}.Instance`);

  export const Value = Symbol.for('');

  export type DSL<T> = T extends {[Instance]: infer V} ? V : T extends RecordType ? Shape.Of<T>[Instance] : never;

  export function dsl<T extends ShapeOrRecord>(shape: T): DSL<T> {
    return 'todo' as any;
  }
}

const Objekt = Object;

/**
 * Velocity Template Language (VTL) Domain-Specific Language.
 */
export namespace VTL {
  export const ExpressionNode = Symbol.for(`${namespace}.ExpressionNode`);
  export const ExpressionType = Symbol.for(`${namespace}.ExpressionType`);
  export const ItemType = Symbol.for(`${namespace}.ItemType`);
  export const NodeType = Symbol.for(`${namespace}.NodeType`);
  export const StatementType = Symbol.for(`${namespace}.StatementType`);

  export type ExpressionNode = typeof ExpressionNode;
  export type ExpressionType = typeof ExpressionType;
  export type ItemType = typeof ItemType;
  export type NodeType = typeof NodeType;
  export type StatementType = typeof StatementType;

  export interface Node<N extends string> {
    [NodeType]: N;
  }
  function isExpression(a: any): a is Expression {
    return a[NodeType] === 'expression';
  }
  export class Expression<T extends ShapeOrRecord = any> implements Node<'expression'> {
    public readonly [NodeType] = 'expression';
    public readonly [ExpressionType]: T;

    constructor(expressionType: T) {
      this[ExpressionType] = expressionType;
    }
  }
  export class Literal<T extends ShapeOrRecord> extends Expression<T> {
    constructor(type: T, public readonly value: Value.Of<T>) {
      super(type);
    }
  }
  // tslint:disable: ban-types
  export class FunctionCall<Args extends Object[], Result extends Shape> extends Expression<Result> {
    constructor(
        public readonly target: Object,
        public readonly name: string,
        public readonly args: Args,
        public readonly result: Result) {
      super(result);
    }
  }
  export class Statement implements Node<'statement'> {
    public readonly [NodeType] = 'statement';
  }

  export type ExpressionOrLiteral<T extends ShapeOrRecord> = Object<T> | Value.Of<T>;
  function resolve<T extends ShapeOrRecord>(type: T, expr: ExpressionOrLiteral<T>): VTL.DSL<T> {
    const shape = Shape.of(type);
    if (isExpression(expr)) {
      return shape.visit(VTLVisitor.instance, expr as any) as any;
    } else {
      return shape.visit(VTLVisitor.instance, new Literal(shape, expr as any)) as any;
    }
  }

  export class Object<T extends ShapeOrRecord = any> implements Node<'object'> {
    public readonly [NodeType] = 'object';
    public readonly [ExpressionNode]: Expression<T>;

    constructor(expressionNode: Expression<T>) {
      this[ExpressionNode] = expressionNode;
    }

    public hashCode(): Integer {
      return new Integer(new FunctionCall(this, 'hashCode', [], integer));
    }
    public equals(other: Object): Bool {
      return new Bool(new FunctionCall(this, 'equals', [other], boolean));
    }
  }
  export namespace Object {
    export type Type<O extends VTL.Object> = O[ExpressionNode][ExpressionType];
    export type Shape<O extends VTL.Object> = Shape.Of<Type<O>>;
  }
  export abstract class Numeric<N extends NumericShape> extends Object<N> {
    public plus(value: ExpressionOrLiteral<NumericShape>) {
      // todo
    }
  }
  export class Number extends Numeric<NumberShape> {}
  export class Integer extends Numeric<IntegerShape> {}

  export class String extends Object<StringShape> {
    public get length(): Integer {
      return new Integer(new FunctionCall(this, 'length', [], integer));
    }
  }
  export class Nothing extends Object<NothingShape> {}
  export const nothing = new Nothing(null as any);
  export class Bool extends Object<BoolShape> {
    // todo: and, or
  }

  export class List<T extends VTL.Object = any> extends Object<ArrayShape<Object.Shape<T>>> {
    public readonly [ItemType]: Object.Shape<T>;

    constructor(expression: Expression<ArrayShape<Object.Shape<T>>>) {
      super(expression);
      this[ItemType] = expression[ExpressionType].Items;
    }

    public get size(): Integer {
      return new Integer(new FunctionCall(this, 'size', [], integer));
    }

    public get(index: ExpressionOrLiteral<IntegerShape>): T {
      return this[ItemType].visit(VTLVisitor.instance, new FunctionCall(this, 'get', [resolve(integer, index)], this[ItemType])) as T;
    }

    public map<U extends VTL.Object>(fn: (item: T) => U): List<U> {
      const item = this[ItemType].visit(VTLVisitor.instance, 'todo' as any) as T;
      return new List(new List.Map(this, fn(item)));
    }
  }
  export namespace List {
    export class Map<T extends VTL.Object, U extends VTL.Object> extends Expression<ArrayShape<Object.Shape<U>>> {
      constructor(public readonly list: List<T>, mappedItem: U) {
        super(array(mappedItem[ExpressionNode][ExpressionType]));
      }
    }
  }

  /**
   * Construct a Record Type with VTL.
   *
   * @param members mappings for each member in the Record.
   */
  export function Dynamic<M extends { [member: string]: VTL.Object; }>(members: M): Record<RecordType<{
    [m in keyof M]: Object.Shape<M[m]>;
  }>> {
    return null as any;
  }

  export function DSL<T extends RecordType>(type: T): {
    VTL: (value: {
      [M in keyof T['members']]: VTL.DSL<T['members'][M]>;
    }) => VTL.DSL<T>
  } {
    return {
      VTL: v => {
        return null as any;
      }
    };
  }
  export function Of<T extends RecordType>(type: T, value: {
    [M in keyof T['members']]: VTL.DSL<T['members'][M]>;
  }): VTL.DSL<T> {
    return DSL(type).VTL(value);
  }

  /**
   * Map a RecordShape to its corresponding VTL RecordObject type.
   */
  export type Record<T extends RecordType> = RecordObject<T> & {
    [M in keyof T['members']]: DSL<T['members'][M]>;
  };
  export class RecordObject<T extends RecordType> extends Object<T> {}
}

declare module '@punchcard/shape/lib/shape' {
  interface Shape {
    [VTL.Instance]: VTL.Object;
  }
}

declare module '@punchcard/shape/lib/primitive' {
  interface NothingShape {
    [VTL.Instance]: VTL.Nothing;
  }
  interface BoolShape {
    [VTL.Instance]: VTL.Bool;
  }
  interface NumericShape {
    [VTL.Instance]: VTL.Numeric<any>;
  }
  interface IntegerShape {
    [VTL.Instance]: VTL.Integer;
  }
  interface NumberShape {
    [VTL.Instance]: VTL.Number;
  }
  interface StringShape {
    [VTL.Instance]: VTL.String;
  }
  interface TimestampShape {
    [VTL.Instance]: VTL.String;
  }
}
declare module '@punchcard/shape/lib/collection' {
  interface ArrayShape<T> {
    [VTL.Instance]: VTL.List<VTL.DSL<T>>;
  }
}

declare module '@punchcard/shape/lib/record' {
  interface RecordShape<M, I> {
    [VTL.Instance]: VTL.Record<this['Type']>;
  }
}
