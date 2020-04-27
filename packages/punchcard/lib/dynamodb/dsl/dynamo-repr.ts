import { array, ArrayShape, boolean, BoolShape, integer, IntegerShape, MapShape, number, NumberShape, RecordShape, Shape, ShapeGuards, string, StringShape } from '@punchcard/shape';
import { VInteger, VObject, VString, VTL } from '../../appsync';
import { DynamoExpr } from './dynamo-expr';
import { addExpressionValue } from './expression-values';
import { addSetAction, UpdateTransaction } from './update-transaction';

const Objekt = Object;

export namespace DynamoDSL {
  export type Repr<T extends Shape> =
    T extends StringShape ? DynamoDSL.String :
    T extends IntegerShape ? DynamoDSL.Int :
    T extends NumberShape ? DynamoDSL.Number :
    T extends ArrayShape<infer I> ? DynamoDSL.List<I> :
    T extends MapShape<infer V> ? DynamoDSL.Map<V> :
    T extends RecordShape<infer M> ? DynamoDSL.Record<T> :
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
    }
    return new DynamoDSL.Object(type, expr) as Repr<T>;
  }

  export class Object<T extends Shape = Shape> {
    constructor(
      public readonly type: T,
      public readonly expr: DynamoExpr
    ) {}

    public equals(value: VObject.Of<T>): DynamoDSL.Bool {
      return new Bool(new DynamoExpr.Operator(this, '=', value));
    }

    public isDefined(): Bool {
      return new Bool(new DynamoExpr.FunctionCall(boolean, 'attribute_exists', [this]));
    }

    public *set(value: VObject.Like<T>): UpdateTransaction<void> {
      const id = yield* addExpressionValue(this.type, value);
      yield* addSetAction(`${id} = `);
    }
  }
  export class Bool extends Object<BoolShape> {
    private static operator(op: string, bs: Bool[]): DynamoDSL.Bool {
      if (bs.length === 0) {
        throw new Error(`attempted to apply opeator ${op} to empty list of booleans`);
      } else if (bs.length === 1) {
        return bs[0];
      }
      return bs.reduce((a, b) => new Bool(new DynamoExpr.Operator(a, op, b)));
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

    public and(...bs: Bool[]): DynamoDSL.Bool {
      return Bool.and(this, ...bs);
    }
    public or(...bs: Bool[]): DynamoDSL.Bool {
      return Bool.or(this, ...bs);
    }
  }
  class Numeric<T extends IntegerShape | NumberShape> extends Object<T> {
    constructor(type: T, expr: DynamoExpr) {
      super(type, expr);
    }
    public *increment(amount?: number | VInteger): VTL<void> {}
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
  export class String extends Object<StringShape> {
    constructor(expr: DynamoExpr) {
      super(string, expr);
    }
  }
  export class List<T extends Shape> extends Object<ArrayShape<T>> {
    constructor(type: T, expr: DynamoExpr) {
      super(array(type), expr);
    }

    public get(index: number | VInteger): DynamoDSL.Repr<T> {
      return DynamoDSL.of(this.type.Items, new DynamoExpr.GetListItem(this, index));
    }

    public *push(value: VObject.Like<ArrayShape<T>> | VObject.Like<T> | DynamoDSL.List<T>): UpdateTransaction<void> {

    }
  }
  export class Map<T extends Shape> extends Object<ArrayShape<T>> {
    constructor(public readonly item: T, expr: DynamoExpr) {
      super(array(item), expr);
    }

    public get(key: string | VString): DynamoDSL.Repr<T> {
      return DynamoDSL.of(this.item, new DynamoExpr.GetMapItem(this, key));
    }

    public *put(key: string | VString, value: VObject.Like<T>): VTL<void> {}
  }
  export class Record<T extends RecordShape> extends Object<T> {
    readonly M: {
      [field in keyof T['Members']]: DynamoDSL.Repr<T['Members'][field]>;
    };

    constructor(type: T, expr: DynamoExpr) {
      super(type, expr);

      this.M = {} as this['M'];
      for (const [name, field] of Objekt.entries(type.Members)) {
        (this.M as any)[name] = new DynamoExpr.Reference(this, field, name);
      }
    }
  }
}