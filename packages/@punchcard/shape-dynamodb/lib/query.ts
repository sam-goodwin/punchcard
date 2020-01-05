import { ClassShape, ClassType, Visitor } from '@punchcard/shape';
import { Runtime } from '@punchcard/shape-runtime';
import { ArrayShape, MapShape, SetShape } from '@punchcard/shape/lib/collection';
import { bool, BoolShape, number, NumberShape, string, StringShape, TimestampShape } from '@punchcard/shape/lib/primitive';
import { Shape } from '@punchcard/shape/lib/shape';

import './class';

declare module '@punchcard/shape/lib/shape' {
  export interface Shape {
    [Query.Tag]: Query.Node;
  }
}

export namespace Query {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-dynamodb.Query.Tag');

  export type DSL<T> = T extends { [Tag]: infer Q } ? Q : never;
  export function dsl<T extends ClassType | Shape>(type: T): DSL<Shape.Of<T>> {
    return (Shape.of(type) as any).visit(new DslVisitor() as any) as any;
  }

  export class DslVisitor implements Visitor<Node> {
    public arrayShape(shape: ArrayShape<any>): List<any> {
      return new List(shape);
    }
    public boolShape(shape: BoolShape): Bool {
      return new Instance(shape);
    }
    public classShape(shape: ClassShape<any>): Struct<any, any> {
      const result: any = {};
      const visitor = new DslVisitor();
      for (const [name, member] of Object.entries(shape.Members)) {
        result[name] = (member as any).Type.visit(visitor);
      }
      return new Struct(shape, result);
    }
    public mapShape(shape: MapShape<any>): Map<any> {
      return new Map(shape);
    }
    public numberShape(shape: NumberShape): Ord<NumberShape> {
      return new Ord(shape);
    }
    public setShape(shape: SetShape<any>): Node {
      return new Set(shape.Items);
    }
    public stringShape(shape: StringShape): Node {
      // tslint:disable: no-construct
      return new String(shape);
    }
    public timestampShape(shape: TimestampShape): Node {
      // TODO
      return new String(string);
    }
  }

  export const NodeType = Symbol.for('@punchcard/shape-dynamodb.Query.NodeType');
  export const ExpressionNodeType = Symbol.for('@punchcard/shape-dynamodb.Query.ExpressionNodeType');
  export const ExpressionType = Symbol.for('@punchcard/shape-dynamodb.Query.ExpressionType');
  export const Expression = Symbol.for('@punchcard/shape-dynamodb.Query.Expression');

  export interface Node {
    [NodeType]: string;
  }
  export const isNode = (a: any): a is Node => a[NodeType] !== undefined;

  export type Expression<T extends Shape> = Runtime.Of<T> | ExpressionNode<T>;

  export interface ExpressionNode<S extends Shape> extends Node {
    [NodeType]: 'expression';
    [ExpressionNodeType]: string;
    [ExpressionType]: S;
  }
  export interface Comparison<T extends Shape, U extends Shape> extends ExpressionNode<BoolShape> {
    lhs: ExpressionNode<T>;
    rhs: ExpressionNode<U>;
  }
  export interface Equals<T extends Shape> extends Comparison<T, T> {
    [ExpressionNodeType]: 'equals';
  }
  export interface Gt<T extends Shape> extends Comparison<T, NumberShape> {
    [ExpressionNodeType]: 'greaterThan';
  }
  export interface Gte<T extends Shape> extends Comparison<T, NumberShape> {
    [ExpressionNodeType]: 'greaterThanOrEqual';
  }
  export interface Lt<T extends Shape> extends Comparison<T, NumberShape> {
    [ExpressionNodeType]: 'lessThan';
  }
  export interface Lte<T extends Shape> extends Comparison<T, NumberShape> {
    [ExpressionNodeType]: 'lessThanOrEqual';
  }
  export interface Between<T extends Shape> extends ExpressionNode<BoolShape> {
    [ExpressionNodeType]: 'between';
    lhs: ExpressionNode<T>;
    lowerBound: ExpressionNode<T>;
    upperBound: ExpressionNode<T>;
  }

  export class Literal<T extends Shape> implements ExpressionNode<T> {
    public readonly [NodeType] = 'expression';
    public readonly [ExpressionNodeType] = 'literal';
    public readonly [ExpressionType]: T;

    constructor(expressionType: T, public readonly value: Runtime.Of<T>) {
      this[ExpressionType] = expressionType;
    }
  }

  export class Instance<T extends Shape> implements ExpressionNode<T> {
    public readonly [NodeType] = 'expression';
    public readonly [ExpressionNodeType] = 'instance';
    public readonly [ExpressionType]: T;
    public readonly [Expression]?: ExpressionNode<T>;

    constructor(shape: T, expression?: ExpressionNode<T>) {
      this[ExpressionType] = shape;
      this[Expression] = expression;
    }

    public equals(other: Expression<T>): Bool {
      return new Bool({
        [NodeType]: 'expression',
        [ExpressionNodeType]: 'equals',
        [ExpressionType]: bool,
        lhs: this,
        rhs: other,
      } as any);
    }
  }

  export class Bool extends Instance<BoolShape> {
    constructor(expression?: ExpressionNode<BoolShape>) {
      super(bool, expression);
    }
  }

  export type AssertInstance<T> = T extends Instance<any> ? T : never;

  export class Ord<T extends Shape> extends Instance<T> {
    public greaterThan(other: Expression<NumberShape>): Bool {
      return this.numberComparison(other, 'greaterThan');
    }
    public greaterThanOrEqual(other: Expression<NumberShape>): Bool {
      return this.numberComparison(other, 'greaterThanOrEqual');
    }
    public lessThan(other: Expression<NumberShape>): Bool {
      return this.numberComparison(other, 'lessThan');
    }
    public lessThanOrEqual(other: Expression<NumberShape>): Bool {
      return this.numberComparison(other, 'lessThanOrEqual');
    }
    public between(lowerBound: Expression<T>, upperBound: Expression<T>): Bool {
      return new Bool({
        [NodeType]: 'expression',
        [ExpressionNodeType]: 'between',
        [ExpressionType]: bool,
        lhs: this,
        lowerBound,
        upperBound
      } as Between<T>);
    }

    private numberComparison<S extends string>(other: Expression<NumberShape>, expressionNodeType: S): Bool {
      return new Bool({
        [NodeType]: 'expression',
        [ExpressionNodeType]: expressionNodeType,
        [ExpressionType]: bool,
        lhs: this,
        rhs: other,
      } as any);
    }
  }

  export interface BeginsWith extends Comparison<StringShape, StringShape> {
    [ExpressionNodeType]: 'beginsWith';
  }
  export class String extends Ord<StringShape> {
    public beginsWith(value: Expression<StringShape>): Bool {
      return new Bool({
        [NodeType]: 'expression',
        [ExpressionType]: bool,
        [ExpressionNodeType]: 'beginsWith',
        lhs: this,
        rhs: isNode(value) ? value : new Literal(this[ExpressionType], value)
      } as any);
    }
  }

  export interface ListGet<T extends Shape> extends ExpressionNode<T> {
    [ExpressionNodeType]: 'list.get';
    list: List<T>;
    index: ExpressionNode<NumberShape>;
  }
  export class List<T extends Shape> extends Instance<ArrayShape<T>> {
    public get(index: Expression<NumberShape>): Instance<T> {
      return new Instance(this[ExpressionType].Items, {
        [NodeType]: 'expression',
        [ExpressionNodeType]: 'list.get',
        [ExpressionType]: this[ExpressionType].Items,
        list: this,
        index: isNode(index) ? index : new Literal(number, index)
      } as ListGet<T>);
    }
  }

  export class Set<T extends Shape> extends Instance<SetShape<T>> {
    // TODO:
  }

  export interface MapGet<T extends Shape> extends ExpressionNode<T> {
    [ExpressionNodeType]: 'map.get';
    map: Map<T>;
    key: ExpressionNode<StringShape>;
  }
  export class Map<T extends Shape> extends Instance<MapShape<T>> {
    public get(key: ExpressionNode<StringShape>): Instance<T> {
      return new Instance(this[ExpressionType].Items, {
        [NodeType]: 'expression',
        [ExpressionNodeType]: 'map.get',
        [ExpressionType]: this[ExpressionType].Items,
        map: this,
        key: isNode(key) ? key : new Literal(string, key)
      } as MapGet<T>);
    }
  }

  export class Struct<T extends ClassShape<any>, Fields> extends Instance<T> {
    constructor(type: T, public readonly fields: Fields) {
      super(type);
    }
  }
}