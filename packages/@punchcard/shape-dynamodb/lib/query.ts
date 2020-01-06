import { AssertIsMember, ClassShape, ClassType, Member, Visitor } from '@punchcard/shape';
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

  export class DslVisitor implements Visitor<Node, ExpressionNode<any>> {
    public arrayShape(shape: ArrayShape<any>, expression: ExpressionNode<any>): List<any> {
      return new List(shape, expression);
    }
    public boolShape(shape: BoolShape, expression: ExpressionNode<any>): Bool {
      return new Bool(expression, shape);
    }
    public classShape(shape: ClassShape<any>, expression: ExpressionNode<any>): Struct<any> {
      const result: any = {};
      const visitor = new DslVisitor();
      for (const [name, member] of Object.entries(shape.Members)) {
        result[name] = (member as any).Type.visit(visitor, );
      }
      return new Struct(shape, result);
    }
    public mapShape(shape: MapShape<any>, expression: ExpressionNode<any>): Map<any> {
      return new Map(shape, expression);
    }
    public numberShape(shape: NumberShape, expression: ExpressionNode<any>): Ord<NumberShape> {
      return new Ord(shape, expression);
    }
    public setShape(shape: SetShape<any>, expression: ExpressionNode<any>): Set<any> {
      return new Set(shape.Items, expression);
    }
    public stringShape(shape: StringShape, expression: ExpressionNode<any>): Node {
      // tslint:disable: no-construct
      return new String(shape, expression);
    }
    public timestampShape(shape: TimestampShape, expression: ExpressionNode<any>): Node {
      // TODO
      return new String(string, expression);
    }
  }
  const dslVisitor = new DslVisitor();

  export const isNode = (a: any): a is Node => a.NodeType !== undefined;

  export type Expression<T extends Shape> = ExpressionNode<T> | Runtime.Of<T>;

  export const NodeType = Symbol.for('@punchcard/shape-dynamodb.Query.NodeType');
  export const DataType = Symbol.for('@punchcard/shape-dynamodb.Query.Type');
  export const ExpressionNodeType = Symbol.for('@punchcard/shape-dynamodb.Query.ExpressionNodeType');
  export const InstanceExpression = Symbol.for('@punchcard/shape-dynamodb.Query.InstanceExpression');

  export class Node<T extends string = string> {
    public readonly [NodeType]: T;
    constructor(nodeType: T) {
      this[NodeType] = nodeType;
    }
  }

  export abstract class ExpressionNode<S extends Shape> extends Node<'expression'> {
    public readonly [DataType]: S;
    constructor(shape: S) {
      super('expression');
      this[DataType] = shape;
    }

    public abstract readonly [ExpressionNodeType]: string;
  }
  export abstract class Comparison<T extends Shape, U extends Shape> extends ExpressionNode<BoolShape> {
    constructor(public readonly left: ExpressionNode<T>, public readonly right: ExpressionNode<U>) {
      super(bool);
    }
  }
  export class Equals<T extends Shape> extends Comparison<T, T> {
    public readonly [ExpressionNodeType] = 'equals';
  }
  export class Gt<T extends Shape> extends Comparison<T, NumberShape> {
    public readonly [ExpressionNodeType] = 'greaterThan';
  }
  export class Gte<T extends Shape> extends Comparison<T, NumberShape> {
    public readonly [ExpressionNodeType] = 'greaterThanOrEqual';
  }
  export class Lt<T extends Shape> extends Comparison<T, NumberShape> {
    public readonly [ExpressionNodeType] = 'lessThan';
  }
  export class Lte<T extends Shape> extends Comparison<T, NumberShape> {
    public readonly [ExpressionNodeType] = 'lessThanOrEqual';
  }
  export class Between<T extends Shape> extends ExpressionNode<BoolShape> {
    public readonly [ExpressionNodeType] = 'between';
    constructor(
      public readonly lhs: ExpressionNode<T>,
      public readonly lowerBound: ExpressionNode<T>,
      public readonly upperBound: ExpressionNode<T>
    ) {
      super(bool);
    }
  }

  export class Literal<T extends Shape> extends ExpressionNode<T> {
    public readonly [ExpressionNodeType] = 'literal';

    constructor(type: T, public readonly value: Runtime.Of<T>) {
      super(type);
    }
  }

  export class Property<T extends Shape> extends ExpressionNode<T> {
    public readonly [ExpressionNodeType] = 'property';
    constructor(type: T, public readonly name: string) {
      super(type);
    }
  }

  function resolveExpression<T extends Shape>(type: T, expression: Expression<T>): ExpressionNode<T> {
    return isNode(expression) ? expression : new Literal(type, expression as any);
  }

  export class Instance<T extends Shape> extends ExpressionNode<T> {
    public readonly [ExpressionNodeType] = 'instance';
    public readonly [InstanceExpression]: ExpressionNode<T>;

    constructor(type: T, instanceExpression: ExpressionNode<T>) {
      super(type);
      this[InstanceExpression] = instanceExpression;
    }

    public equals(other: Expression<T>): Bool {
      return new Bool(new Equals(this, resolveExpression(this[DataType], other)));
    }
  }

  export class Bool extends Instance<BoolShape> {
    constructor(expression?: ExpressionNode<BoolShape>, boolShape?: BoolShape) {
      super(boolShape || bool, expression!);
    }
  }

  export type AssertInstance<T> = T extends Instance<any> ? T : never;

  export class Ord<T extends Shape> extends Instance<T> {
    public greaterThan(other: Expression<NumberShape>): Bool {
      return new Bool(new Gt(this, resolveExpression(number, other)));
    }
    public greaterThanOrEqual(other: Expression<NumberShape>): Bool {
      return new Bool(new Gte(this, resolveExpression(number, other)));
    }
    public lessThan(other: Expression<NumberShape>): Bool {
      return new Bool(new Lt(this, resolveExpression(number, other)));
    }
    public lessThanOrEqual(other: Expression<NumberShape>): Bool {
      return new Bool(new Lte(this, resolveExpression(number, other)));
    }
    public between(lowerBound: Expression<T>, upperBound: Expression<T>): Bool {
      return new Bool(new Between(this, resolveExpression(this[DataType], lowerBound), resolveExpression(this[DataType], upperBound)));
    }
  }

  export class BeginsWith extends Comparison<StringShape, StringShape> {
    public readonly [ExpressionNodeType] = 'beginsWith';
  }
  export class String extends Ord<StringShape> {
    public beginsWith(value: Expression<StringShape>): Bool {
      return new Bool(new BeginsWith(this, resolveExpression(this[DataType], value)));
    }
  }

  export class ListItem<T extends Shape> extends ExpressionNode<T> {
    public readonly [ExpressionNodeType] = 'list.item';
    constructor(public readonly list: List<T>, public readonly index: ExpressionNode<NumberShape>) {
      super(list[DataType].Items);
    }
  }
  export class List<T extends Shape> extends Instance<ArrayShape<T>> {
    public get(index: Expression<NumberShape>): DSL<T> {
      return new Instance(this[DataType].Items, new ListItem(this, resolveExpression(number, index))) as DSL<T>;
    }
  }

  export class SetItem<T extends Shape> extends ExpressionNode<T> {
    public readonly [ExpressionNodeType] = 'set.item';
    constructor(public readonly set: Set<T>, public readonly index: ExpressionNode<NumberShape>) {
      super(set[DataType].Items);
    }
  }
  export class Set<T extends Shape> extends Instance<SetShape<T>> {
    public get(index: Expression<NumberShape>): DSL<T> {
      return new Instance(this[DataType].Items, new SetItem(this, resolveExpression(number, index))) as DSL<T>;
    }
  }

  export class MapItem<T extends Shape> extends ExpressionNode<T> {
    public readonly [ExpressionNodeType] = 'map.item';
    constructor(public readonly map: Map<T>, public readonly key: ExpressionNode<StringShape>) {
      super(map[DataType].Items);
    }
  }
  export class Map<T extends Shape> extends Instance<MapShape<T>> {
    public get(key: Expression<StringShape>): DSL<T> {
      return new Instance(this[DataType].Items, new MapItem(this, resolveExpression(string, key))) as DSL<T>;
    }
  }

  export class Struct<T extends ClassShape<any>> extends Instance<T> {
    public readonly Fields: {
      [fieldName in keyof T['Members']]: DSL<AssertIsMember<T['Members'][fieldName]>['Type']>
    };

    constructor(type: T, expression: ExpressionNode<T>) {
      super(type, expression);
      this.Fields = {} as any;
      for (const [name, prop] of Object.entries(type.Members)) {
        Member.assertInstance(prop);
        (this.Fields as any)[name] = (prop as any).visit(dslVisitor, new StructProperty(prop.Type, name));
      }
    }
  }

  export class StructProperty<T extends Shape> extends ExpressionNode<T> {
    public readonly [ExpressionNodeType] = 'struct.property';

    constructor(type: T, public readonly name: string) {
      super(type);
    }
  }
}