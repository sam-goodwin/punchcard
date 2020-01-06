import { AssertIsMember, ClassShape, ClassType, Member, Visitor } from '@punchcard/shape';
import { Runtime } from '@punchcard/shape-runtime';
import { ArrayShape, MapShape, SetShape } from '@punchcard/shape/lib/collection';
import { bool, BoolShape, number, NumberShape, string, StringShape, TimestampShape } from '@punchcard/shape/lib/primitive';
import { Shape } from '@punchcard/shape/lib/shape';
import { AttributeValue } from './attribute';
import { Mapper } from './mapper';
import { Writer } from './writer';

import './class';

// tslint:disable: ban-types
declare module '@punchcard/shape/lib/shape' {
  export interface Shape {
    [DSL.Tag]: DSL.Node;
  }
}

// we have a thing named Object inside Query, so stash this here.
const Objekt = Object;

export namespace DSL {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-dynamodb.Query.Tag');

  export type Of<T> = T extends { [Tag]: infer Q } ? Q : never;
  export type OfType<T extends ClassType> = Of<Shape.Of<T>>;

  export function of<T extends ClassType>(type: T): OfType<T>['fields'] {
    const shape = Shape.of(type);
    const result: any = {};
    for (const [name, member] of Objekt.entries(shape.Members)) {
      result[name] = member.Type.visit(DslVisitor, new RootProperty(member.Type, name));
    }
    return result;
  }

  export const DslVisitor: Visitor<Node, ExpressionNode<any>> = {
    arrayShape: (shape: ArrayShape<any>, expression: ExpressionNode<any>): List<any> => {
      return new List(shape, expression);
    },
    boolShape: (shape: BoolShape, expression: ExpressionNode<any>): Bool => {
      return new Bool(expression, shape);
    },
    classShape: (shape: ClassShape<any>, expression: ExpressionNode<any>): Struct<any> => {
      return new Struct(shape, expression);
    },
    mapShape: (shape: MapShape<any>, expression: ExpressionNode<any>): Map<any> => {
      return new Map(shape, expression);
    },
    numberShape: (shape: NumberShape, expression: ExpressionNode<any>): Ord<NumberShape> => {
      return new Ord(shape, expression);
    },
    setShape: (shape: SetShape<any>, expression: ExpressionNode<any>): Set<any> => {
      return new Set(shape.Items, expression);
    },
    stringShape: (shape: StringShape, expression: ExpressionNode<any>): Node => {
      // tslint:disable: no-construct
      return new String(expression, shape);
    },
    timestampShape: (shape: TimestampShape, expression: ExpressionNode<any>): Node => {
      // TODO
      return new String(expression);
    }
  };
}

export namespace DSL {
  export const isNode = (a: any): a is Node => a[NodeType] !== undefined;

  export type Expression<T extends Shape> = ExpressionNode<T> | Runtime.Of<T>;

  export const NodeType = Symbol.for('@punchcard/shape-dynamodb.Query.NodeType');
  export const SubNodeType = Symbol.for('@punchcard/shape-dynamodb.Query.SubNodeType');
  export const DataType = Symbol.for('@punchcard/shape-dynamodb.Query.Type');
  export const InstanceExpression = Symbol.for('@punchcard/shape-dynamodb.Query.InstanceExpression');

  export class Node<T extends string = string> {
    public readonly [NodeType]: T;
    constructor(nodeType: T) {
      this[NodeType] = nodeType;
    }
  }

  export abstract class StatementNode extends Node<'statement'> {
    public abstract [SubNodeType]: string;
    constructor() {
      super('statement');
    }
    public abstract synthesize(writer: Writer): void;
  }

  export abstract class ExpressionNode<S extends Shape> extends Node<'expression'> {
    public readonly [DataType]: S;
    public abstract readonly [SubNodeType]: string;

    constructor(shape: S) {
      super('expression');
      this[DataType] = shape;
    }
    public abstract synthesize(writer: Writer): void;
  }

  export class Literal<T extends Shape> extends ExpressionNode<T> {
    public readonly [SubNodeType] = 'literal';

    constructor(type: T, public readonly value: AttributeValue.Of<T>) {
      super(type);
    }

    public synthesize(writer: Writer): void {
      writer.writeValue(this.value as AWS.DynamoDB.AttributeValue);
    }
  }

  export class RootProperty<T extends Shape> extends ExpressionNode<T> {
    public [SubNodeType] = 'root-property';

    constructor(type: T, public readonly name: string) {
      super(type);
    }

    public synthesize(writer: Writer): void {
      writer.writeName(this.name);
    }
  }

  function resolveExpression<T extends Shape>(type: T, expression: Expression<T>): ExpressionNode<T> {
    return isNode(expression) ? expression : new Literal(type, Mapper.of(type).write(expression as any) as any);
  }

  export class FunctionCall<T extends Shape> extends ExpressionNode<T> {
    public [SubNodeType] = 'function-call';
    constructor(public readonly name: string, public readonly returnType: T, public readonly parameters: Array<ExpressionNode<any>>) {
      super(returnType);
    }

    public synthesize(writer: Writer): void {
      writer.writeToken(this.name);
      writer.writeToken('(');
      if (this.parameters.length > 0) {
        this.parameters.forEach(p => {
          p.synthesize(writer);
          writer.writeToken(',');
        });
        writer.pop();
      }
      writer.writeToken(')');
    }
  }

  export class Object<T extends Shape> extends ExpressionNode<T> {
    public readonly [SubNodeType] = 'object';
    public readonly [InstanceExpression]: ExpressionNode<T>;

    constructor(type: T, instanceExpression: ExpressionNode<T>) {
      super(type);
      this[InstanceExpression] = instanceExpression;
    }

    public synthesize(writer: Writer): void {
      this[InstanceExpression].synthesize(writer);
    }

    public equals(other: Expression<T>): Bool {
      return new Bool(new Object.Equals(this, resolveExpression(this[DataType], other)));
    }

    public size(): Number {
      return new Number(new FunctionCall('size', number, [this]));
    }

    public set(value: Expression<T>): Object.Assign<T> {
      return new Object.Assign(this, resolveExpression(this[DataType], value));
    }
  }
  export namespace Object {
    export class Assign<T extends Shape> extends StatementNode {
      public [SubNodeType] = 'assign';

      constructor(private readonly instance: Object<T>, private readonly value: ExpressionNode<T>) {
        super();
      }

      public synthesize(writer: Writer): void {
        writer.writeToken('SET ');
        this.instance.synthesize(writer);
        writer.writeToken('=');
        this.value.synthesize(writer);
      }
    }
    export abstract class Comparison<T extends Shape, U extends Shape> extends ExpressionNode<BoolShape> {
      protected abstract operator: string;
      constructor(public readonly left: ExpressionNode<T>, public readonly right: ExpressionNode<U>) {
        super(bool);
      }

      public synthesize(writer: Writer): void {
        this.left.synthesize(writer);
        writer.writeToken(this.operator);
        this.right.synthesize(writer);
      }
    }
    export class Equals<T extends Shape> extends Object.Comparison<T, T> {
      protected readonly operator: '=' = '=';
      public readonly [SubNodeType] = 'equals';
    }
  }

  export function size(path: Object<any>) {
    return new Size(path);
  }
  export class Size extends FunctionCall<NumberShape> {
    constructor(path: Object<any>) {
      super('size', number, [path]);
    }
  }

  export class Bool extends Object<BoolShape> {
    constructor(expression: ExpressionNode<BoolShape>, boolShape?: BoolShape) {
      super(boolShape || bool, expression);
    }

    public and(...conditions: Array<Expression<BoolShape>>): Bool {
      return new Bool(new Bool.And([this, ...conditions]));
    }

    public or(...conditions: Array<Expression<BoolShape>>): Bool {
      return new Bool(new Bool.Or([this, ...conditions]));
    }

    public not(): Bool {
      return new Bool(new Bool.Not(this), this[DataType]);
    }
  }
  export namespace Bool {
    export abstract class Operands extends ExpressionNode<BoolShape> {
      public abstract readonly operator: string;

      constructor(public readonly operands: Array<ExpressionNode<BoolShape>>) {
        super(bool);
      }

      public synthesize(writer: Writer): void {
        writer.writeToken('(');
        for (const op of this.operands) {
          op.synthesize(writer);
          writer.writeToken(this.operator);
        }
        writer.pop();
        writer.writeToken(')');
      }
    }

    export class And extends Operands {
      public readonly operator = 'AND';
      public [SubNodeType] = 'and';
    }
    export class Or extends Operands {
      public readonly operator = 'OR';
      public [SubNodeType] = 'or';
    }
    export class Not extends ExpressionNode<BoolShape> {
      public [SubNodeType] = 'or';

      constructor(public readonly operand: ExpressionNode<BoolShape>) {
        super(bool);
      }

      public synthesize(writer: Writer): void {
        writer.writeToken('NOT');
        writer.writeToken('(');
        this.operand.synthesize(writer);
        writer.writeToken(')');
      }
    }
  }
  export function or(...operands: Array<ExpressionNode<BoolShape>>): Bool {
    return new Bool(new Bool.Or(operands));
  }
  export function and(...operands: Array<ExpressionNode<BoolShape>>): Bool {
    return new Bool(new Bool.And(operands));
  }
  export function not(operand: ExpressionNode<BoolShape>): Bool {
    return new Bool(new Bool.Not(operand));
  }

  export class Ord<T extends Shape> extends Object<T> {
    public greaterThan(other: Expression<NumberShape>): Bool {
      return new Bool(new Ord.Gt(this, resolveExpression(number, other)));
    }
    public greaterThanOrEqual(other: Expression<NumberShape>): Bool {
      return new Bool(new Ord.Gte(this, resolveExpression(number, other)));
    }
    public lessThan(other: Expression<NumberShape>): Bool {
      return new Bool(new Ord.Lt(this, resolveExpression(number, other)));
    }
    public lessThanOrEqual(other: Expression<NumberShape>): Bool {
      return new Bool(new Ord.Lte(this, resolveExpression(number, other)));
    }
    public between(lowerBound: Expression<T>, upperBound: Expression<T>): Bool {
      return new Bool(new Ord.Between(this, resolveExpression(this[DataType], lowerBound), resolveExpression(this[DataType], upperBound)));
    }
  }
  export namespace Ord {
    export class Gt<T extends Shape> extends Object.Comparison<T, NumberShape> {
      protected readonly operator: '>' = '>';
      public readonly [SubNodeType] = 'greaterThan';
    }
    export class Gte<T extends Shape> extends Object.Comparison<T, NumberShape> {
      protected readonly operator: '>=' = '>=';
      public readonly [SubNodeType] = 'greaterThanOrEqual';
    }
    export class Lt<T extends Shape> extends Object.Comparison<T, NumberShape> {
      protected readonly operator: '<' = '<';
      public readonly [SubNodeType] = 'lessThan';
    }
    export class Lte<T extends Shape> extends Object.Comparison<T, NumberShape> {
      protected readonly operator: '<=' = '<=';
      public readonly [SubNodeType] = 'lessThanOrEqual';
    }
    export class Between<T extends Shape> extends ExpressionNode<BoolShape> {
      public readonly [SubNodeType] = 'between';
      constructor(
        public readonly lhs: ExpressionNode<T>,
        public readonly lowerBound: ExpressionNode<T>,
        public readonly upperBound: ExpressionNode<T>
      ) {
        super(bool);
      }

      public synthesize(writer: Writer): void {
        this.lhs.synthesize(writer);
        writer.writeToken('BEGTWEEN');
        writer.writeToken('(');
        this.lowerBound.synthesize(writer);
        writer.writeToken(',');
        this.upperBound.synthesize(writer);
        writer.writeToken(')');
      }
    }
  }

  export type SetValue<T extends Shape> = ExpressionNode<T> | Computation<T>;

  export abstract class Computation<T extends Shape> extends StatementNode {
    public readonly [SubNodeType] = 'computation';

    public abstract readonly operator: string;

    constructor(public readonly lhs: SetValue<T>, public readonly rhs: SetValue<T>) {
      super();
    }

    public synthesize(writer: Writer): void {
      this.lhs.synthesize(writer);
    }
  }

  export class ComputationExpression<T extends Shape> extends ExpressionNode<T> {
    public [SubNodeType] = 'computation-expression';

    constructor(shape: T, public readonly computation: Computation<T>) {
      super(shape);
    }

    public synthesize(writer: Writer): void {
      this.computation.synthesize(writer);
    }
  }

  abstract class Action<T extends Shape> extends StatementNode {
    public abstract readonly actionName: string;

    public synthesize(writer: Writer): void {
      writer.writeToken(`${this.actionName} `);
      this.synthesizeAction(writer);
    }

    protected abstract synthesizeAction(writer: Writer): void;
  }
  export class SetAction<T extends Shape> extends Action<T> {
    public [SubNodeType]: string;
    public [SubNodeType] = 'set-action';

    public readonly actionName: 'SET' = 'SET';

    constructor(public readonly path: ExpressionNode<T>, public readonly value: SetValue<T>) {
      super();
    }

    protected synthesizeAction(writer: Writer): void {
      this.path.synthesize(writer);
      writer.writeToken(' = ');
      this.value.synthesize(writer);
    }
  }

  export class Number extends Ord<NumberShape> {
    constructor(expression: ExpressionNode<NumberShape>, shape?: NumberShape) {
      super(shape || number, expression);
    }

    public plus(value: Expression<NumberShape>): Number.Plus {
      return new Number.Plus(this, resolveExpression(this[DataType], value));
    }

    public minus(value: Expression<NumberShape>): Number.Minus {
      return new Number.Minus(this, resolveExpression(this[DataType], value));
    }
  }
  export namespace Number {
    export class Plus extends Computation<NumberShape> {
      public operator: '+' = '+';
    }

    export class Minus extends Computation<NumberShape> {
      public operator: '-' = '-';
    }
  }

  export class String extends Ord<StringShape> {
    constructor(expression: ExpressionNode<StringShape>, shape?: StringShape) {
      super(shape || string, expression);
    }
    public beginsWith(value: Expression<StringShape>): Bool {
      return String.beginsWith(this, value);
    }
  }
  export namespace String {
    export class BeginsWith extends FunctionCall<BoolShape> {
      public readonly [SubNodeType] = 'string-begins-with';

      constructor(lhs: ExpressionNode<StringShape>, rhs: ExpressionNode<StringShape>) {
        super('begins_with', bool, [lhs, rhs]);
      }
    }

    export function beginsWith(lhs: Expression<StringShape>, rhs: Expression<StringShape>) {
      return new Bool(new String.BeginsWith(resolveExpression(string, lhs), resolveExpression(string, rhs)));
    }
  }

  export class List<T extends Shape> extends Object<ArrayShape<T>> {
    public get(index: Expression<NumberShape>): Of<T> {
      return new Object(this[DataType].Items, new List.Item(this, resolveExpression(number, index))) as Of<T>;
    }

    public push(item: Expression<T>): SetAction<T> {
      return new SetAction(this.get(1) as any, resolveExpression(this[DataType].Items, item));
    }

    public concat(list: Expression<ArrayShape<T>>): SetAction<ArrayShape<T>> {
      return new SetAction(this, new List.Append(this, resolveExpression(this[DataType], list) as List<T>));
    }
  }
  export namespace List {
    export class Item<T extends Shape> extends ExpressionNode<T> {
      public readonly [SubNodeType] = 'list-item';

      constructor(public readonly list: List<T>, public readonly index: ExpressionNode<NumberShape>) {
        super(list[DataType].Items);
      }

      public synthesize(writer: Writer): void {
        this.list.synthesize(writer);
        writer.writeToken('[');
        this.index.synthesize(writer);
        writer.writeToken(']');
      }
    }
    export class Append<T extends Shape> extends FunctionCall<ArrayShape<T>> {
      public [SubNodeType]: 'list-concat' = 'list-concat';

      constructor(public readonly list: List<T>, public readonly values: List<T>) {
        super('list_append', list[DataType], [list, values]);
      }
    }
  }

  export class Set<T extends Shape> extends Object<SetShape<T>> {
    public contains(value: Expression<T>): Bool {
      return new Bool(new Set.Contains(this, resolveExpression(this[DataType].Items, value)));
    }
  }
  export namespace Set {
    export class Contains<T extends Shape> extends FunctionCall<BoolShape> {
      constructor(set: Set<T>, value: ExpressionNode<T>) {
        super('contains', bool, [set, value]);
      }
    }
  }

  export class Map<T extends Shape> extends Object<MapShape<T>> {
    public get(key: Expression<StringShape>): Of<T> {
      return new Object(this[DataType].Items, new Map.MapValue(this, resolveExpression(string, key))) as Of<T>;
    }
  }
  export namespace Map {
    export class MapValue<T extends Shape> extends ExpressionNode<T> {
      public readonly [SubNodeType] = 'map-value';
      constructor(public readonly map: Map<T>, public readonly key: ExpressionNode<StringShape>) {
        super(map[DataType].Items);
      }

      public synthesize(writer: Writer): void {
        this.map.synthesize(writer);
        writer.writeToken('.');
        this.key.synthesize(writer);
      }
    }
  }

  export class Struct<T extends ClassShape<any>> extends Object<T> {
    public readonly fields: {
      [fieldName in keyof T['Members']]: Of<AssertIsMember<T['Members'][fieldName]>['Type']>
    };

    constructor(type: T, expression: ExpressionNode<T>) {
      super(type, expression);
      this.fields = {} as any;
      for (const [name, prop] of Objekt.entries(type.Members)) {
        Member.assertInstance(prop);
        (this.fields as any)[name] = prop.Type.visit(DslVisitor, new Struct.Field(this, prop.Type, name));
      }
    }
  }
  export namespace Struct {
    export class Field<T extends Shape> extends ExpressionNode<T> {
      public readonly [SubNodeType] = 'struct-field';

      constructor(public readonly struct: Struct<any>, type: T, public readonly name: string) {
        super(type);
      }

      public synthesize(writer: Writer): void {
        this.struct.synthesize(writer);
        writer.writeToken('.');
        writer.writeName(this.name);
      }
    }
  }
}
