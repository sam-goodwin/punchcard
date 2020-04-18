import { array, ArrayShape, BoolShape, integer, IntegerShape, MapShape, number, NumberShape, RecordShape, Shape, ShapeGuards, string, StringShape } from '@punchcard/shape';
import { DDB } from '@punchcard/shape-dynamodb';
import { IfBranch, VExpression, VInteger, VObject, VString, VTL, vtl } from '../appsync';
import { KeyGraphQLRepr } from './table';

const Objekt = Object;

export namespace Filter {
  export function of<T extends Shape>(shape: T, expr: VExpression): Repr<T> {
    if (ShapeGuards.isStringShape(shape)) {
      return new Filter.String(shape);
    }
  }
  export type Repr<T extends Shape> =
    T extends StringShape ? Filter.String :
    T extends IntegerShape ? Filter.Int :
    T extends NumberShape ? Filter.Number :
    T extends ArrayShape<infer I> ? Filter.List<I> :
    T extends MapShape<infer V> ? Filter.Map<V> :
    T extends RecordShape<infer M> ? Filter.Object<T> & {
      [field in keyof M]: Filter.Repr<M[field]>;
    } :
    Filter.Object<T>
  ;
  export class Object<T extends Shape> {
    constructor(public readonly type: T, public readonly expr: VExpression) {}

    public get size(): Filter.Int {}
    public eq(value: VObject.Like<T>): Bool {}
    public ne(value: VObject.Like<T>): Bool {}
    public isDefined(): Bool {}
    public isUndefined(): Bool {}
  }
  export class Bool extends Object<BoolShape> {
  }
  export class Numeric<T extends IntegerShape | NumberShape> extends Object<T> {
    public gt(value: VObject.Like<T>): Bool {}
    public gte(value: VObject.Like<T>): Bool {}
    public lt(value: VObject.Like<T>): Bool {}
    public lte(value: VObject.Like<T>): Bool {}
  }
  export class Int extends Numeric<IntegerShape> {}
  export class Number extends Numeric<IntegerShape> {}
  export class String extends Object<StringShape> {
    public beingsWith(value: VObject.Like<StringShape>): Bool {}
    public get length(): Int {
      return this.size;
    }
  }
  export class List<T extends Shape> extends Object<ArrayShape<T>> {
    public get(index: number | Int): Filter.Repr<T> {}
  }
  export class Map<T extends Shape> extends Object<ArrayShape<T>> {
    public get(key: string | Filter.String): Filter.Repr<T> {}
  }
}

export namespace Update {
  export type Request<DataType extends RecordShape, Key extends DDB.KeyOf<DataType>> = {
    key: KeyGraphQLRepr<DataType, Key>;
    actions: (item: Update.Repr<DataType>['M']) => Update.Transaction<void>;
    if?: (item: Filter.Repr<DataType>) => VTL<Filter.Bool>;
  };
  export type Repr<T extends Shape> =
    T extends StringShape ? Update.String :
    T extends IntegerShape ? Update.Int :
    T extends NumberShape ? Update.Number :
    T extends ArrayShape<infer I> ? Update.List<I> :
    T extends MapShape<infer V> ? Update.Map<V> :
    T extends RecordShape<infer M> ? Update.Record<T> :
    Object<T>
  ;
  export function of<T extends Shape>(type: T, expr: Update.Expr): Repr<T> {
    if (ShapeGuards.isStringShape(type)) {
      return new Update.String(expr) as Repr<T>;
    } else if (ShapeGuards.isIntegerShape(type)) {
      return new Update.Int(expr) as Repr<T>;
    } else if (ShapeGuards.isNumberShape(type)) {
      return new Update.Number(expr) as Repr<T>;
    } else if (ShapeGuards.isArrayShape(type)) {
      return new Update.List(type.Items, expr) as Repr<T>;
    } else if (ShapeGuards.isMapShape(type)) {
      return new Update.Map(type.Items, expr) as Repr<T>;
    } else if (ShapeGuards.isRecordShape(type)) {
      return new Update.Record(type, expr) as Repr<T>;
    }
    return new Update.Object(type, expr) as Repr<T>;
  }

  export class Object<T extends Shape> {
    constructor(
      public readonly type: T,
      public readonly expr: Update.Expr
    ) {}

    public *set(value: VObject.Like<T>): Update.Transaction<void> {
      const id = yield* Statement.addExpressionValue(this.type, value);
      yield* Statement.addSetAction(`${id} = `);
      // yield new Statement.AddSetAction(this);
    }
  }
  class Numeric<T extends IntegerShape | NumberShape> extends Object<T> {
    constructor(type: T, expr: Update.Expr) {
      super(type, expr);
    }
    public *increment(amount?: number | VInteger): VTL<void> {}
  }
  export class Int extends Numeric<IntegerShape> {
    constructor(expr: Update.Expr) {
      super(integer, expr);
    }
  }
  export class Number extends Numeric<NumberShape> {
    constructor(expr: Update.Expr) {
      super(number, expr);
    }
  }
  export class String extends Object<StringShape> {
    constructor(expr: Update.Expr) {
      super(string, expr);
    }
  }
  export class List<T extends Shape> extends Object<ArrayShape<T>> {
    constructor(type: T, expr: Update.Expr) {
      super(array(type), expr);
    }

    public get(index: number | VInteger): Update.Repr<T> {
      return Update.of(this.type.Items, new Expr.GetListItem(this, index));
    }

    public *push(value: VObject.Like<ArrayShape<T>> | VObject.Like<T> | Update.List<T>): Update.Transaction<void> {

    }
  }

  /**
   * An update transaction against an item.
   */
  export type Transaction<T> = Generator<Statement<Shape>, T>;

  export type Statement<T extends Shape = Shape> =
    | Statement.AddExpressionValue<T>
    | Statement.AddExpressionName
    | Statement.AddSetAction
    | IfBranch<T, Statement<Shape>>
  ;
  export namespace Statement {
    export function isAddExpressionName(a: any): a is AddExpressionName {
      return a.tag === AddExpressionName.TAG;
    }
    export function *addExpressionName(expr: Update.Expr<Shape>): Update.Transaction<string> {
      return (yield new AddExpressionName(expr)) as any;
    }
    export class AddExpressionName {
      public static readonly TAG = 'add-expression-name';
      public readonly tag = AddExpressionName.TAG;
      constructor(
        public readonly expr: Update.Expr<Shape>
      ) {}
    }
    export function isAddExpressionValue(a: any): a is AddExpressionValue<Shape> {
      return a.tag === AddExpressionValue.TAG;
    }
    export function *addExpressionValue<T extends Shape>(type: T, value: VObject.Like<T>): Update.Transaction<string> {
      return (yield new AddExpressionValue(type, value)) as any;
    }
    export class AddExpressionValue<T extends Shape> {
      public static readonly TAG = 'add-expression-value';
      public readonly tag = AddExpressionValue.TAG;
      constructor(
        public readonly type: T,
        public readonly value: VObject.Like<T>
      ) {}
    }

    export function isAddSetAction(a: any): a is AddSetAction {
      return a.tag === AddSetAction.TAG;
    }
    export function *addSetAction(action: string | VString): Update.Transaction<string> {
      return (yield new AddSetAction(action)) as any;
    }
    export class AddSetAction {
      public static readonly TAG = 'add-set-action';
      public readonly tag = AddSetAction.TAG;
      constructor(
        public readonly action: string | VString
      ) {}
    }
  }
  export type Expr<T extends Shape = Shape> =
    | Expr.GetListItem<T>
    | Expr.GetMapItem<T>
    | Expr.Reference<T>
  ;
  export namespace Expr {
    export function isReference(a: any): a is Reference<Shape> {
      return a.tag === Reference.TAG;
    }
    export class Reference<T extends Shape> {
      public static readonly TAG = 'reference';
      public readonly tag = Reference.TAG;
      constructor(
        public readonly target: Update.Object<Shape> | undefined,
        public readonly type: T,
        public readonly id: string,
      ) {}
    }
    export function isGetListItem(a: any): a is GetListItem<Shape> {
      return a.tag === GetListItem.TAG;
    }
    export class GetListItem<T extends Shape> {
      public static readonly TAG = 'get-list-item';
      public readonly tag = GetListItem.TAG;
      constructor(
        public readonly list: List<T>,
        public readonly index: number | VInteger,
      ) {}
    }

    export function isGetMapItem(a: any): a is GetMapItem<Shape> {
      return a.tag === GetMapItem.TAG;
    }
    export class GetMapItem<T extends Shape> {
      public static readonly TAG = 'get-map-item';
      public readonly tag = GetMapItem.TAG;
      constructor(
        public readonly map: Map<T>,
        public readonly key: string | VString,
      ) {}
    }
  }
  export class Map<T extends Shape> extends Object<ArrayShape<T>> {
    constructor(public readonly item: T, expr: Update.Expr) {
      super(array(item), expr);
    }

    public get(key: string | VString): Update.Repr<T> {
      return Update.of(this.item, new Expr.GetMapItem(this, key));
    }

    public *put(key: string | VString, value: VObject.Like<T>): VTL<void> {}
  }
  export class Record<T extends RecordShape> extends Object<T> {
    readonly M: {
      [field in keyof T['Members']]: Update.Repr<T['Members'][field]>;
    };

    constructor(type: T, expr: Update.Expr) {
      super(type, expr);

      this.M = {} as this['M'];
      for (const [name, field] of Objekt.entries(type.Members)) {
        (this.M as any)[name] = new Expr.Reference(this, field, name);
      }
    }
  }
}