import { array, ArrayShape, BinaryShape, bool, boolean, BoolShape, integer, IntegerShape, map, MapShape, number, NumberShape, set, SetShape, Shape, ShapeGuards, string, StringShape, timestamp, TimestampShape, TypeShape, UnionShape } from '@punchcard/shape';
import { AttributeValue } from '@punchcard/shape-dynamodb';
import { getState, VInteger, VList, VObject, VString, VTL, vtl } from '../../appsync';
import { DynamoExpr } from './dynamo-expr';
import { DynamoGuards } from './guards';
import { addValue, toPath } from './util';

const Objekt = Object;

export namespace DynamoDSL {
  export type Repr<T extends Shape> =
    T extends TimestampShape ? DynamoDSL.Timestamp :
    T extends StringShape ? DynamoDSL.String :
    T extends IntegerShape ? DynamoDSL.Int :
    T extends NumberShape ? DynamoDSL.Number :
    T extends ArrayShape<infer I> ? DynamoDSL.List<I> :
    T extends SetShape<infer I> ?
      I extends StringShape | TimestampShape | BinaryShape | NumberShape ?
        DynamoDSL.Set<I> :
        DynamoDSL.List<I> :
    T extends MapShape<infer V> ? DynamoDSL.Map<V> :
    T extends TypeShape<infer M> ? DynamoDSL.Record<T> :
    Object<T>
  ;
  export function of<T extends Shape>(type: T, expr: DynamoExpr): Repr<T> {
    if (ShapeGuards.isStringShape(type)) {
      return new DynamoDSL.String(expr) as Repr<T>;
    } else if (ShapeGuards.isIntegerShape(type)) {
      return new DynamoDSL.Int(expr) as Repr<T>;
    } else if (ShapeGuards.isNumberShape(type)) {
      return new DynamoDSL.Number(expr) as Repr<T>;
    } else if (ShapeGuards.isArrayShape(type)) {
      return new DynamoDSL.List(type.Items, expr) as Repr<T>;
    } else if (ShapeGuards.isMapShape(type)) {
      return new DynamoDSL.Map(type.Items, expr) as Repr<T>;
    } else if (ShapeGuards.isRecordShape(type)) {
      return new DynamoDSL.Record(type, expr) as Repr<T>;
    } else if (ShapeGuards.isTimestampShape(type)) {
      return new DynamoDSL.Timestamp(expr) as Repr<T>;
    }
    return new DynamoDSL.Object(type, expr) as Repr<T>;
  }

  export function expectAll(...conditions: DynamoDSL.Bool[]) {
    return expect(conditions.reduce((a, b) => a.and(b)));
  }

  export function expectAny(...conditions: DynamoDSL.Bool[]) {
    return expect(conditions.reduce((a, b) => a.or(b)));
  }

  export function *expect(condition: DynamoDSL.Bool): VTL<void> {
    yield* vtl`$util.qr($CONDITION.add("${yield* descend(condition.expr)}"))`;

    function *descend(expr: DynamoExpr): VTL<string> {
      if(DynamoExpr.isOperator(expr)) {
        const lhs = `${yield* descend(expr.lhs.expr)} ${expr.operator}`;
        const rhs = DynamoGuards.isObject(expr.rhs) ?
          yield* descend(expr.rhs.expr) :
          yield* addValue(expr.type, expr.rhs)
        ;
        return `${lhs} ${rhs}`;
      } else {
        return yield* toPath(expr);
      }
    }
  }

  export class Object<T extends Shape = Shape> {
    public readonly dynamoType: AttributeValue.ShapeOf<T, {
      setAsList: false;
    }>;

    constructor(
      public readonly type: T,
      public readonly expr: DynamoExpr,
    ) {
      this.dynamoType = AttributeValue.shapeOf(this.type);
    }

    public get size(): DynamoDSL.Int {
      return new Int(new DynamoExpr.FunctionCall(bool, 'size', [{
        type: this.type,
        value: this
      }]));
    }

    public exists(): DynamoDSL.Bool {
      return new Bool(new DynamoExpr.FunctionCall(boolean, 'attribute_exists', [{
        type: this.type,
        value: this
      }]));
    }

    public notExists(): DynamoDSL.Bool {
      return new Bool(new DynamoExpr.FunctionCall(boolean, 'attribute_not_exists', [{
        type: this.type,
        value: this
      }]));
    }

    public equals(value: VObject.Like<T>): DynamoDSL.Bool {
      return new Bool(new DynamoExpr.Operator(this.type, this, '=', value));
    }

    public *set(value: VObject.Like<T>): VTL<void> {
      const thisPath = yield* toPath(this.expr);
      const valueId = yield* addValue(this.type, value);
      yield* vtl`$util.qr($SET.add("${thisPath} = ${valueId}"))`;
    }
  }
  export class Bool extends Object<BoolShape> {
    private static operator(op: string, bs: Bool[]): DynamoDSL.Bool {
      if (bs.length === 0) {
        throw new Error(`attempted to apply opeator ${op} to empty list of booleans`);
      } else if (bs.length === 1) {
        return bs[0];
      }
      return bs.reduce((a, b) => new Bool(new DynamoExpr.Operator(bool, a as any, op, b as any)));
    }
    public static and(...bs: Bool[]): DynamoDSL.Bool {
      return Bool.operator('and', bs);
    }
    public static or(...bs: Bool[]): DynamoDSL.Bool {
      return Bool.operator('or', bs);
    }

    constructor(expr: DynamoExpr) {
      super(boolean, expr);
    }

    public assert() {
      return DynamoDSL.expect(this);
    }

    public and(...bs: Bool[]): DynamoDSL.Bool {
      return Bool.and(this, ...bs);
    }
    public or(...bs: Bool[]): DynamoDSL.Bool {
      return Bool.or(this, ...bs);
    }
  }
  class Ord<T extends Shape> extends Object<T> {
    public gt(value: VObject.Like<T> | DynamoDSL.Repr<T>): Bool {
      return new Bool(new DynamoExpr.Operator(this.type, this as Object<Shape>, '>', value));
    }
    public gte(value: VObject.Like<T> | DynamoDSL.Repr<T>): Bool {
      return new Bool(new DynamoExpr.Operator(this.type, this as Object<Shape>, '>=', value));
    }
    public lt(value: VObject.Like<T> | DynamoDSL.Repr<T>): Bool {
      return new Bool(new DynamoExpr.Operator(this.type, this as Object<Shape>, '<', value));
    }
    public lte(value: VObject.Like<T> | DynamoDSL.Repr<T>): Bool {
      return new Bool(new DynamoExpr.Operator(this.type, this as Object<Shape>, '<=', value));
    }
  }
  class Numeric<T extends IntegerShape | NumberShape> extends Ord<T> {
    constructor(type: T, expr: DynamoExpr) {
      super(type, expr);
    }

    public *increment(amount?: number | VInteger): VTL<void> {
      const thisPath = yield* toPath(this.expr);
      const valueId = yield* addValue(this.type, amount === undefined ? 1 : amount);
      yield* vtl`$util.qr($ADD.add("${thisPath} ${valueId}"))`;
    }
  }
  export class Int extends Numeric<IntegerShape> {
    constructor(expr: DynamoExpr) {
      super(integer, expr);
    }
  }
  export class Number extends Numeric<NumberShape> {
    constructor(expr: DynamoExpr) {
      super(number, expr);
    }
  }

  export class Timestamp extends Ord<TimestampShape> {
    constructor(expr: DynamoExpr) {
      super(timestamp, expr);
    }
  }

  export class String extends Ord<StringShape> {
    constructor(expr: DynamoExpr) {
      super(string, expr);
    }

    public startsWith(prefix: VObject.Like<StringShape>): Bool {
      return new Bool(new DynamoExpr.FunctionCall(bool, 'starts_with', [{
        type: string,
        value: prefix
      }]));
    }
  }
  export class List<T extends Shape> extends Object<ArrayShape<T>> {
    constructor(type: T, expr: DynamoExpr) {
      super(array(type), expr);
    }

    public get(index: number | VInteger): DynamoDSL.Repr<T> {
      return DynamoDSL.of(this.type.Items, new DynamoExpr.GetListItem(this, index));
    }

    public push(...values: VObject.Like<T>[]): VTL<void>;
    public push(list: VList<VObject.Of<T>> | DynamoDSL.List<T>): VTL<void>;
    public *push(...args: any[]) {
      const { valueId, thisPath } = yield* prepareList(this.type, this.expr, args);
      yield* vtl`$util.qr($SET.add("${thisPath} = list_append(${thisPath}, ${valueId})"))`;
    }
  }
  // helper for adding a list or set of items in the transaction
  function *prepareList(type: Shape, expr: DynamoExpr, args: any[]) {
    return {
      valueId: args.length === 1 && VObject.isList(args[0]) ?
        yield* addValue(type, args[0] as any) :
        yield* addValue(type, args as any),
      thisPath: yield* toPath(expr)
    };
  }

  export class Set<T extends StringShape | TimestampShape | NumberShape | BinaryShape> extends Object<SetShape<T>> {
    constructor(type: T, expr: DynamoExpr) {
      super(set(type as any), expr);
    }

    public add(...values: VObject.Like<T>[]): VTL<void>;
    public add(list: VList<VObject.Of<T>> | DynamoDSL.Set<T>): VTL<void>;
    public *add(...args: any[]) {
      const { valueId, thisPath } = yield* prepareList(this.type, this.expr, args);
      yield* vtl`$util.qr($ADD.add("${thisPath} ${valueId}"))`;
    }

    public remove(...values: VObject.Like<T>[]): VTL<void>;
    public remove(list: VList<VObject.Of<T>> | DynamoDSL.Set<T>): VTL<void>;
    public *remove(...args: any[]) {
      const { valueId, thisPath } = yield* prepareList(this.type, this.expr, args);
      yield* vtl`$util.qr($ADD.add("${thisPath} ${valueId}"))`;
    }
  }
  export class Map<T extends Shape> extends Object<MapShape<T>> {
    constructor(public readonly item: T, expr: DynamoExpr) {
      super(map(item), expr);
    }

    public get(key: string | VString): DynamoDSL.Repr<T> {
      return DynamoDSL.of(this.item, new DynamoExpr.GetMapItem(this, key));
    }

    public has(key: string | VString): DynamoDSL.Bool {
      return this.get(key).exists();
    }

    public *put(key: string | VString, value: VObject.Like<T>): VTL<void> {
      const state = yield* getState();
      const thisPath = yield* toPath(this.expr);
      const keyId = state.newId('#');
      yield* vtl`$util.qr($NAMES.put("${keyId}", ${typeof key === 'string' ? `"${key}"` : key}))`;
      const valueId = yield* addValue(this.item, value);
      yield* vtl`$util.qr($SET.add("${thisPath}.${keyId} = ${valueId}"))`;
    }
  }
  export class Record<T extends TypeShape> extends Object<T> {
    readonly M: {
      [field in keyof T['Members']]: DynamoDSL.Repr<T['Members'][field]>;
    };

    constructor(type: T, expr: DynamoExpr) {
      super(type, expr);

      this.M = {} as this['M'];
      for (const [name, field] of Objekt.entries(type.Members)) {
        (this.M as any)[name] = of(field, new DynamoExpr.Reference(this as Object<Shape>, field, name));
      }
    }
  }
}