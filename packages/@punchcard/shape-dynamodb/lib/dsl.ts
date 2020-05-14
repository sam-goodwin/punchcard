import { RecordShape, RecordType, ShapeGuards, ShapeVisitor, UnionShape, Value } from '@punchcard/shape';
import { ArrayShape, MapShape, SetShape } from '@punchcard/shape/lib/collection';
import { FunctionArgs, FunctionShape } from '@punchcard/shape/lib/function';
import { AnyShape, BinaryShape, bool, BoolShape, IntegerShape, NothingShape, number, NumberShape, string, StringShape, TimestampShape } from '@punchcard/shape/lib/primitive';
import { Shape } from '@punchcard/shape/lib/shape';
import { AttributeValue } from './attribute';
import { Mapper } from './mapper';
import { Writer } from './writer';

// tslint:disable: ban-types

// we have a thing named Object inside Query, so stash this here.
const Objekt = Object;

export namespace DSL {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-dynamodb.Query.Tag');

  export type Of<T extends Shape> =
    T extends BinaryShape ? DSL.Binary :
    T extends BoolShape ? DSL.Bool :
    T extends AnyShape ? DSL.Any<T> :
    T extends NumberShape ? DSL.Number :
    T extends StringShape ? DSL.String :
    T extends TimestampShape ? DSL.String :
    T extends UnionShape<infer U> ?
      U extends 1 ? {
        [i in Extract<keyof U, number>]: Of<U[i]>
      }[1] :
      NothingShape extends Extract<U[Extract<keyof U, number>], NothingShape> ?
        U['length'] extends 1 ? DSL.Object<NothingShape> :
        U['length'] extends 2 ?
          Exclude<{
            [i in Extract<keyof U, number>]: Of<U[i]>;
          }[Extract<keyof U, number>], DSL.Object<NothingShape>> :
        DSL.Union<T> :
      DSL.Union<T> :

    T extends RecordShape<any> ? DSL.Struct<T> :
    T extends MapShape<infer V> ? DSL.Map<V> :
    T extends SetShape<infer I> ? DSL.Set<I> :
    T extends ArrayShape<infer I> ? DSL.List<I> :
    T extends { [Tag]: infer Q } ? Q :
    DSL.Object<T>
    ;

  export type Root<T extends RecordShape<any>> = Struct<T>['fields'];

  export function of<T extends RecordShape<any>>(shape: T): Root<T> {
    const result: any = {};
    for (const [name, member] of Objekt.entries(shape.Members)) {
      result[name] = (member as Shape).visit(DslVisitor, new RootProperty(member as Shape, name));
    }
    return result;
  }

  export function _of<T extends Shape>(shape: T, expr: ExpressionNode<any>): Of<T> {
    return shape.visit(DslVisitor as any, expr) as Of<T>;
  }

  export const DslVisitor: ShapeVisitor<Node, ExpressionNode<any>> = {
    literalShape: (shape, expression) => {
      return shape.Type.visit(DslVisitor as any, expression);
    },
    unionShape: (shape, expression) => {
      const items = shape.Items.filter(i => !ShapeGuards.isNothingShape(i));
      if (items.length === 1) {
        return _of(items[0], expression);
      }
      return new Union(shape, expression);
    },
    functionShape: (() => {
      throw new Error(`functionShape is not valid on a DynamoDB DSL`);
    }) as any,
    neverShape: (() => {
      throw new Error(`neverShape is not valid on a DynamoDB DSL`);
    }) as any,
    nothingShape: (shape: NothingShape, expression: ExpressionNode<any>): Object<NothingShape> => {
      return new Object(shape, expression);
    },
    anyShape: (shape: AnyShape, expression: ExpressionNode<any>): Any<any> => {
      return new Any(shape, expression);
    },
    binaryShape: (shape: BinaryShape, expression: ExpressionNode<any>): Binary => {
      return new Binary(shape, expression);
    },
    arrayShape: (shape: ArrayShape<any>, expression: ExpressionNode<any>): List<any> => {
      return new Proxy(new List(shape, expression), {
        get: (target, prop) => {
          if (typeof prop === 'string') {
            if (!isNaN(prop as any)) {
              return target.get(parseInt(prop, 10));
            }
          } else if (typeof prop === 'number' && prop % 1 === 0) {
            return target.get(prop);
          }
          return (target as any)[prop];
        }
      });
    },
    boolShape: (shape: BoolShape, expression: ExpressionNode<any>): Bool => {
      return new Bool(expression, shape);
    },
    recordShape: (shape: RecordShape<any>, expression: ExpressionNode<any>): Struct<any> => {
      return new Struct(shape, expression);
    },
    mapShape: (shape: MapShape<any>, expression: ExpressionNode<any>): Map<any> => {
      return new Proxy(new Map(shape, expression), {
        get: (target, prop) => {
          if (typeof prop === 'string') {
            if (typeof (target as any)[prop] === 'function') {
              return (target as any)[prop];
            }
            return target.get(prop);
          }
          return (target as any)[prop];
        }
      });
    },
    numberShape: (shape: NumberShape, expression: ExpressionNode<any>): Number => {
      return new DSL.Number(expression, shape);
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

  export type Expression<T extends Shape> = ExpressionNode<T> | Value.Of<T>;

  export const NodeType = Symbol.for('@punchcard/shape-dynamodb.DSL.NodeType');
  export const SubNodeType = Symbol.for('@punchcard/shape-dynamodb.DSL.SubNodeType');
  export const DataType = Symbol.for('@punchcard/shape-dynamodb.DSL.DataType');
  export const InstanceExpression = Symbol.for('@punchcard/shape-dynamodb.DSL.InstanceExpression');
  export const Synthesize = Symbol.for('@punchcard/shape-dynamodb.DSL.Synthesize');

  export abstract class Node<T extends string = string> {
    public readonly [NodeType]: T;
    constructor(nodeType: T) {
      this[NodeType] = nodeType;
    }

    public abstract [Synthesize](writer: Writer): void;
  }

  export function isStatementNode(a: any): a is StatementNode {
    return a[NodeType] === 'statement';
  }
  export abstract class StatementNode extends Node<'statement'> {
    public abstract [SubNodeType]: string;
    constructor() {
      super('statement');
    }
  }

  export abstract class ExpressionNode<S extends Shape> extends Node<'expression'> {
    public readonly [DataType]: S;
    public abstract readonly [SubNodeType]: string;

    constructor(shape: S) {
      super('expression');
      this[DataType] = shape;
    }
  }

  export class Id extends ExpressionNode<StringShape> {
    public readonly [SubNodeType] = 'identifier';

    constructor(public readonly value: string) {
      super(string);
    }

    public [Synthesize](writer: Writer): void {
      writer.writeName(this.value);
    }
  }

  export function isLiteral(a: any): a is Literal<any> {
    return a[SubNodeType] === 'literal';
  }
  export class Literal<T extends Shape> extends ExpressionNode<T> {
    public readonly [SubNodeType] = 'literal';

    constructor(type: T, public readonly value: Value.Of<AttributeValue.ShapeOf<T>>) {
      super(type);
    }

    public [Synthesize](writer: Writer): void {
      writer.writeValue(this.value as AWS.DynamoDB.AttributeValue);
    }
  }

  export class RootProperty<T extends Shape> extends ExpressionNode<T> {
    public [SubNodeType] = 'root-property';

    constructor(type: T, public readonly name: string) {
      super(type);
    }

    public [Synthesize](writer: Writer): void {
      writer.writeName(this.name);
    }
  }

  function resolveExpression<T extends Shape>(type: T, expression: Expression<T> | Computation<T>): ExpressionNode<T> {
    return isComputation(expression) ?
      new ComputationExpression(type, expression) :
      isNode(expression) ?
        expression :
        new Literal(type, Mapper.of(type).write(expression as any) as any)
      ;
  }

  export class FunctionCall<T extends Shape> extends ExpressionNode<T> {
    public [SubNodeType] = 'function-call';
    constructor(
      public readonly name: string,
      public readonly returnType: T,
      public readonly parameters: ExpressionNode<any>[]
    ) {
      super(returnType);
    }

    public [Synthesize](writer: Writer): void {
      writer.writeToken(this.name);
      writer.writeToken('(');
      if (this.parameters.length > 0) {
        this.parameters.forEach(p => {
          p[Synthesize](writer);
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

    public [Synthesize](writer: Writer): void {
      this[InstanceExpression][Synthesize](writer);
    }

    public equals(other: Expression<T>): Bool {
      return new Bool(new Object.Equals(this, resolveExpression(this[DataType], other)));
    }

    public get size(): Number {
      return new Number(new FunctionCall('size', number, [this]));
    }

    public set(value: Expression<T> | Computation<T>): Action {
      return new Action(ActionType.SET, new Object.Assign(this, resolveExpression(this[DataType], value)));
    }

    public exists(): Bool {
      return new Bool(new FunctionCall('attribute_exists', bool, [this]));
    }

    public notExists(): Bool {
      return new Bool(new FunctionCall('attribute_not_exists', bool, [this]));
    }
  }
  export namespace Object {
    export function beginsWith(lhs: Expression<StringShape>, rhs: Expression<StringShape>) {
      return new Bool(new String.BeginsWith(resolveExpression(string, lhs), resolveExpression(string, rhs)));
    }

    export class Assign<T extends Shape> extends StatementNode {
      public [SubNodeType] = 'assign';

      constructor(private readonly instance: Object<T>, private readonly value: Node) {
        super();
      }

      public [Synthesize](writer: Writer): void {
        this.instance[Synthesize](writer);
        writer.writeToken('=');
        this.value[Synthesize](writer);
      }
    }
    export abstract class Comparison<T extends Shape, U extends Shape> extends ExpressionNode<BoolShape> {
      protected abstract operator: string;
      constructor(public readonly left: ExpressionNode<T>, public readonly right: ExpressionNode<U>) {
        super(bool);
      }

      public [Synthesize](writer: Writer): void {
        this.left[Synthesize](writer);
        writer.writeToken(this.operator);
        this.right[Synthesize](writer);
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

    public and(...conditions: Expression<BoolShape>[]): Bool {
      return new Bool(new Bool.And([this, ...(conditions.map(c => resolveExpression(bool, c)))]));
    }

    public or(...conditions: Expression<BoolShape>[]): Bool {
      return new Bool(new Bool.Or([this, ...(conditions.map(c => resolveExpression(bool, c)))]));
    }

    public not(): Bool {
      return new Bool(new Bool.Not(this), this[DataType]);
    }
  }
  export namespace Bool {
    export abstract class Operands extends ExpressionNode<BoolShape> {
      public abstract readonly operator: string;

      constructor(public readonly operands: ExpressionNode<BoolShape>[]) {
        super(bool);
      }

      public [Synthesize](writer: Writer): void {
        writer.writeToken('(');
        for (const op of this.operands) {
          op[Synthesize](writer);
          writer.writeToken(` ${this.operator} `);
        }
        writer.pop();
        writer.writeToken(')');
      }
    }

    export class And extends Operands {
      public readonly operator = 'AND';
      public [SubNodeType]: 'and' = 'and';
    }
    export class Or extends Operands {
      public readonly operator = 'OR';
      public [SubNodeType]: 'or' = 'or';
    }
    export class Not extends ExpressionNode<BoolShape> {
      public [SubNodeType]: 'not' = 'not';

      constructor(public readonly operand: ExpressionNode<BoolShape>) {
        super(bool);
      }

      public [Synthesize](writer: Writer): void {
        writer.writeToken('NOT');
        writer.writeToken('(');
        this.operand[Synthesize](writer);
        writer.writeToken(')');
      }
    }
  }
  export function or(...operands: ExpressionNode<BoolShape>[]): Bool {
    return new Bool(new Bool.Or(operands));
  }
  export function and(...operands: ExpressionNode<BoolShape>[]): Bool {
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

      public [Synthesize](writer: Writer): void {
        this.lhs[Synthesize](writer);
        writer.writeToken(' BETWEEN ');
        this.lowerBound[Synthesize](writer);
        writer.writeToken(' AND ');
        this.upperBound[Synthesize](writer);
      }
    }
  }

  export function isComputation(a: any): a is Computation<any> {
    return isStatementNode(a) && a[SubNodeType] === 'computation';
  }

  /**
   * Computations are not Expressions, although they do represent a value.
   *
   * This is because they are not usable within Query or Filter expressions.
   *
   * E.g. this is impossible:
   * ```
   * table.putIf(.., item => item.plus(1).equals(2))
   * ```
   */
  export abstract class Computation<T extends Shape> extends StatementNode {
    public readonly [SubNodeType] = 'computation';

    public abstract readonly operator: string;

    constructor(public readonly lhs: ExpressionNode<T>, public readonly rhs: ExpressionNode<T>) {
      super();
    }

    public [Synthesize](writer: Writer): void {
      this.lhs[Synthesize](writer);
      writer.writeToken(this.operator);
      this.rhs[Synthesize](writer);
    }
  }

  export class ComputationExpression<T extends Shape> extends ExpressionNode<T> {
    public [SubNodeType] = 'computation-expression';

    constructor(shape: T, public readonly computation: Computation<T>) {
      super(shape);
    }

    public [Synthesize](writer: Writer): void {
      this.computation[Synthesize](writer);
    }
  }

  export enum ActionType {
    SET = 'SET'
  }
  export class Action {
    constructor(public readonly actionType: ActionType, public readonly statement: StatementNode) {}
  }

  /**
   * Represents a number in a DynamoDB Filter, Query or Update expression.
   */
  export class Number extends Ord<NumberShape> {
    constructor(expression: ExpressionNode<NumberShape>, shape?: NumberShape) {
      super(shape || number, expression);
    }

    public decrement(value?: Expression<NumberShape>) {
      return this.set(this.minus(value === undefined ? 1 : value));
    }

    public increment(value?: Expression<NumberShape>) {
      return this.set(this.plus(value === undefined ? 1 : value));
    }

    public minus(value: Expression<NumberShape>): Number.Minus {
      return new Number.Minus(this, resolveExpression(this[DataType], value));
    }

    public plus(value: Expression<NumberShape>): Number.Plus {
      return new Number.Plus(this, resolveExpression(this[DataType], value));
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

  export class Binary extends Object<BinaryShape> {}

  export class String extends Ord<StringShape> {
    constructor(expression: ExpressionNode<StringShape>, shape?: StringShape) {
      super(shape || string, expression);
    }
    public beginsWith(value: Expression<StringShape>): Bool {
      return String.beginsWith(this, value);
    }
    public get length() {
      return this.size;
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
    constructor(type: ArrayShape<T>, expression: ExpressionNode<ArrayShape<T>>) {
      super(type, expression);
    }

    [index: number]: Of<T>;

    public get length() {
      return this.size;
    }

    public get(index: Expression<NumberShape>): Of<T> {
      return this[DataType].Items.visit(DSL.DslVisitor as any, new List.Item(this, resolveExpression(number, index)));
    }

    public push(item: Expression<T>): Action {
      return new Action(ActionType.SET, new Object.Assign(this.get(1) as any, resolveExpression(this[DataType].Items, item)));
    }

    public concat(list: Expression<ArrayShape<T>>): Action {
      return new Action(ActionType.SET, new Object.Assign(this, new List.Append(this, resolveExpression(this[DataType], list) as List<T>)));
    }
  }
  export namespace List {
    export class Item<T extends Shape> extends ExpressionNode<T> {
      public readonly [SubNodeType] = 'list-item';

      constructor(public readonly list: List<T>, public readonly index: ExpressionNode<NumberShape>) {
        super(list[DataType].Items as T);
      }

      public [Synthesize](writer: Writer): void {
        this.list[Synthesize](writer);
        writer.writeToken('[');
        if (isLiteral(this.index)) {
          // indexing a list should not write the literal as an attribute value
          writer.writeToken((this.index as any).value.N);
        } else {
          this.index[Synthesize](writer);
        }
        writer.writeToken(']');
      }
    }
    export class Append<T extends Shape> extends FunctionCall<ArrayShape<T>> {
      public [SubNodeType]: 'list-append' = 'list-append';

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
      return this[DataType].Items.visit(DSL.DslVisitor as any, typeof key === 'string' ? new Map.GetValue(this, new Id(key)) as any : new Map.GetValue(this, resolveExpression(string, key)));
    }
    public put(key: Expression<StringShape>, value: Expression<T>): Action {
      return new Action(ActionType.SET, new Object.Assign(this.get(key) as any, resolveExpression(this[DataType].Items, value)));
    }
  }
  export namespace Map {
    export class GetValue<T extends Shape> extends ExpressionNode<T> {
      public readonly [SubNodeType] = 'map-value';
      constructor(public readonly map: Map<T>, public readonly key: ExpressionNode<StringShape>) {
        super(map[DataType].Items as T);
      }

      public [Synthesize](writer: Writer): void {
        this.map[Synthesize](writer);
        writer.writeToken('.');
        this.key[Synthesize](writer);
      }
    }
  }

  export class Struct<T extends RecordShape<any>> extends Object<T> {
    public readonly fields: {
      [fieldName in keyof T['Members']]: Of<T['Members'][fieldName]>;
    };

    constructor(type: T, expression: ExpressionNode<T>) {
      super(type, expression);
      this.fields = {} as any;
      for (const [name, prop] of Objekt.entries(type.Members)) {
        (this.fields as any)[name] = (prop as Shape).visit(DslVisitor, new Struct.Field(this, prop as Shape, name));
      }
    }
  }
  export namespace Struct {
    export class Field<T extends Shape> extends ExpressionNode<T> {
      public readonly [SubNodeType] = 'struct-field';

      constructor(public readonly struct: Struct<any>, type: T, public readonly name: string) {
        super(type);
      }

      public [Synthesize](writer: Writer): void {
        this.struct[Synthesize](writer);
        writer.writeToken('.');
        writer.writeName(this.name);
      }
    }
  }

  export class Any<T extends AnyShape> extends Object<T> {
    public as<S extends Shape>(shape: S): DSL.Of<S> {
      return shape.visit(DslVisitor as any, this);
    }

    public equals(args: never): never {
      throw new Error('equals is not supported on a dynamic type, you must first cast with `as(shape)`');
    }

    public set(args: never): never {
      throw new Error('equals is not supported on a dynamic type, you must first cast with `as(shape)`');
    }
  }

  export class Union<T extends UnionShape<Shape[]>> extends Object<T> {
    public as<S extends T['Items'][Extract<keyof T['Items'], number>]>(shape: S): DSL.Of<S> {
      return shape.visit(DslVisitor as any, this);
    }
  }
}
