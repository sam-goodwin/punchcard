import { ArrayShape, integer, IntegerShape, Shape, ShapeOrRecord } from '@punchcard/shape';
import { Condition } from './choice';
import { $forEach } from './control';
import { Expression, ExpressionKind, Reference } from './expression';
import { Scope } from './scope';
import { Type } from './symbols';
import { Bool, Integer, Thing } from './thing';

export class List<T extends Thing = any> extends Thing<ArrayShape<Thing.GetType<T>>> {
  constructor(expression: Expression<ArrayShape<Thing.GetType<T>>>) {
    super(expression);

    return new Proxy(this, {
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
  }

  /**
   * Get an item from the by index.
   *
   * Syntactic sugar for `list.get(index)`.
   *
   * ```ts
   * const list: List = ...
   * list.get(0);
   * list[0];
   * ```
   */
  [index: number]: T;

  /**
   * Get an item from the by index.
   *
   * Note: you can use an array index as syntactic sugar for this method.
   *
   * ```ts
   * const list: List = ...
   * list.get(0);
   * list[0];
   * ```
   *
   * @param index of item to get
   */
  public get(index: number): T {
    return this[Type].Items.visit(Thing.visitor, new List.Index(this, index));
  }

  public filter(fn: (item: T) => Bool | Condition): List<T> {
    return null as any;
  }

  public map<U extends Thing>(fn: (item: T, index: Integer, scope: Scope) => U): List<U> {
    const expr = Thing.getExpression(this);
    if (Expression.Guards.isListMap(expr)) {
      
    }

    const index = new Integer(new Reference('$$.Map.Item.Index', integer));
    const inputValue = (this[Type].Items as Shape).visit(Thing.visitor, new Reference('$$.Map.Item.Value', this[Type].Items));
    // const scope = Thread.get()!.push();
    // const outputValue: U = fn(inputValue as T, index, scope);

    return new List(new List.Map(this, fn) as any);
  }

  public forEach(fn: (item: T, index: Integer, scope: Scope) => void): void {
    return $forEach(this, fn);
  }

  public length(): Integer {
    return new Integer(new List.Length(this));
  }
}
export namespace List {
  export type GetItem<L extends List> = L extends List<infer T> ? T : never;

  export class Index<T extends Thing = any> extends Expression<Thing.GetType<T>> {
    public readonly [ExpressionKind]: 'listIndex' = 'listIndex';

    constructor(public readonly list: List<T>, public readonly index: number) {
      super(Thing.getType(list).Items);
    }
  }

  export class Length extends Expression<IntegerShape> {
    public readonly [ExpressionKind]: 'listLength' = 'listLength';

    constructor(public readonly list: List) {
      super(integer);
    }
  }

  export class Map<L extends List = any, U extends ShapeOrRecord = any> extends Expression<ArrayShape<Shape.Of<U>>> {
    public [ExpressionKind]: 'listMap' = 'listMap';

    constructor(public readonly from: L, public readonly map: ((item: List.GetItem<L>, index: Integer, scope: Scope) => Thing.Of<U>)) {
      super();
    }
  }
}