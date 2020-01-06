import { AssertIsMember, ClassShape, ClassType, Member, Visitor } from '@punchcard/shape';
import { Runtime } from '@punchcard/shape-runtime';
import { ArrayShape, MapShape, SetShape } from '@punchcard/shape/lib/collection';
import { bool, BoolShape, number, NumberShape, string, StringShape, TimestampShape } from '@punchcard/shape/lib/primitive';
import { Shape } from '@punchcard/shape/lib/shape';

// tslint:disable: ban-types

import './class';

declare module '@punchcard/shape/lib/shape' {
  export interface Shape {
    [Query.Tag]: Query.Node;
  }
}

// we have a thing named Object inside Query, so stash this here.
const Objekt = Object;

export namespace Query {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-dynamodb.Query.Tag');

  export type DSL<T> = T extends { [Tag]: infer Q } ? Q : never;
  export function dsl<T extends ClassType>(type: T): DSL<Shape.Of<T>>['fields'] {
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

export namespace Query {
  export const isNode = (a: any): a is Node => a[NodeType] !== undefined;

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

    public abstract synthesize(writer: Writer): void;
  }

  export class Literal<T extends Shape> extends ExpressionNode<T> {
    public readonly [ExpressionNodeType] = 'literal';

    constructor(type: T, public readonly value: AttributeValue.Of<T>) {
      super(type);
    }

    public synthesize(writer: Writer): void {
      writer.writeValue(this.value as AWS.DynamoDB.AttributeValue);
    }
  }

  export class RootProperty<T extends Shape> extends ExpressionNode<T> {
    public [ExpressionNodeType] = 'root-property';

    constructor(type: T, public readonly name: string) {
      super(type);
    }

    public synthesize(writer: Writer): void {
      writer.writeName(this.name);
    }
  }

  function resolveExpression<T extends Shape>(type: T, expression: Expression<T>): ExpressionNode<T> {
    return isNode(expression) ? expression : new Literal(type, mapper(type).write(expression as any) as any);
  }

  export class FunctionCall<T extends Shape> extends ExpressionNode<T> {
    public [ExpressionNodeType] = 'function-call';
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
    public readonly [ExpressionNodeType] = 'object';
    public readonly [InstanceExpression]: ExpressionNode<T>;

    constructor(type: T, instanceExpression: ExpressionNode<T>) {
      super(type);
      this[InstanceExpression] = instanceExpression;
    }

    public synthesize(writer: Writer): void {
      this[InstanceExpression].synthesize(writer);
    }

    public equals(other: Expression<T>): Bool {
      return new Bool(new Equals(this, resolveExpression(this[DataType], other)));
    }

    public size(): Number {
      return new Number(new FunctionCall('size', number, [this]));
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

  export class Equals<T extends Shape> extends Comparison<T, T> {
    protected readonly operator = '=';
    public readonly [ExpressionNodeType] = 'equals';
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
      public [ExpressionNodeType] = 'and';
    }
    export class Or extends Operands {
      public readonly operator = 'OR';
      public [ExpressionNodeType] = 'or';
    }
    export class Not extends ExpressionNode<BoolShape> {
      public [ExpressionNodeType] = 'or';

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
    export class Gt<T extends Shape> extends Comparison<T, NumberShape> {
      protected readonly operator = '>';
      public readonly [ExpressionNodeType] = 'greaterThan';
    }
    export class Gte<T extends Shape> extends Comparison<T, NumberShape> {
      protected readonly operator = '>=';
      public readonly [ExpressionNodeType] = 'greaterThanOrEqual';
    }
    export class Lt<T extends Shape> extends Comparison<T, NumberShape> {
      protected readonly operator = '<';
      public readonly [ExpressionNodeType] = 'lessThan';
    }
    export class Lte<T extends Shape> extends Comparison<T, NumberShape> {
      protected readonly operator = '<=';
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

  export class Number extends Ord<NumberShape> {
    constructor(expression: ExpressionNode<NumberShape>, shape?: NumberShape) {
      super(shape || number, expression);
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
      public readonly [ExpressionNodeType] = 'string-begins-with';

      constructor(lhs: ExpressionNode<StringShape>, rhs: ExpressionNode<StringShape>) {
        super('begins_with', bool, [lhs, rhs]);
      }
    }

    export function beginsWith(lhs: Expression<StringShape>, rhs: Expression<StringShape>) {
      return new Bool(new String.BeginsWith(resolveExpression(string, lhs), resolveExpression(string, rhs)));
    }
  }

  export class List<T extends Shape> extends Object<ArrayShape<T>> {
    public get(index: Expression<NumberShape>): DSL<T> {
      return new Object(this[DataType].Items, new List.Item(this, resolveExpression(number, index))) as DSL<T>;
    }
  }
  export namespace List {
    export class Item<T extends Shape> extends ExpressionNode<T> {
      public readonly [ExpressionNodeType] = 'list-item';

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
    public get(key: Expression<StringShape>): DSL<T> {
      return new Object(this[DataType].Items, new Map.MapValue(this, resolveExpression(string, key))) as DSL<T>;
    }
  }
  export namespace Map {
    export class MapValue<T extends Shape> extends ExpressionNode<T> {
      public readonly [ExpressionNodeType] = 'map-value';
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
      [fieldName in keyof T['Members']]: DSL<AssertIsMember<T['Members'][fieldName]>['Type']>
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
      public readonly [ExpressionNodeType] = 'struct-field';

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

import AWS = require('aws-sdk');
import { AttributeValue } from './attribute';
import { mapper } from './mapper';

export namespace Query {
  export function compile(expression: Bool): FilterExpression {
    const writer = new Writer();
    expression.synthesize(writer);
    return writer.toFilterExpression();
  }

  export interface FilterExpression extends Pick<AWS.DynamoDB.QueryInput, 'FilterExpression' | 'ExpressionAttributeValues' | 'ExpressionAttributeNames'> {}

  export class Writer {
    private tokens: string[] = [];

    private readonly aliases: {
      [alias: string]: string;
    } = {};
    private readonly values: {
      [id: string]: AWS.DynamoDB.AttributeValue;
    } = {};

    private namesCounter = 0;
    private valuesCounter = 0;

    public toFilterExpression(): FilterExpression {
      return {
        FilterExpression: this.tokens.join(''),
        ExpressionAttributeNames: this.aliases,
        ExpressionAttributeValues: this.values
      };
    }

    public head(): string | undefined {
      return this.tokens.slice(-1)[0];
    }

    public pop(): string | undefined {
      return this.tokens.pop();
    }

    public writeToken(token: string) {
      this.tokens.push(token);
    }

    public writeValue(value: AWS.DynamoDB.AttributeValue): string {
      const id = this.newValueId();
      this.values[id] = value;
      this.writeToken(id);
      return id;
    }

    public writeName(name: string): string {
      const alias = this.newNameAlias();
      this.aliases[alias] = name;
      this.writeToken(alias);
      return alias;
    }

    private newNameAlias(): string  {
      return '#' + (this.namesCounter += 1).toString();
    }

    private newValueId(): string {
      return ':' + (this.valuesCounter += 1).toString();
    }
  }
}