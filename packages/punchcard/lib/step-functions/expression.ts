import { ShapeOrRecord, Value } from '@punchcard/shape';
import { List } from './list';

export const ExpressionKind = Symbol.for('@punchcard/lib/step-functions/expression.ExpressionKind');

export type ExpressionOrLiteral<T extends ShapeOrRecord> = Value.Of<T> | Expression<T>;

/**
 * AST for defining Expressions which yield values.
 */
export abstract class Expression<T extends ShapeOrRecord = any> {
  public abstract readonly [ExpressionKind]: keyof Expression.Visitor;

  constructor(public readonly type: T) {}

  public visit<V extends Expression.Visitor>(visitor: V, context: Expression.Visitor.GetContext<V>): Expression.Visitor.GetThing<V> {
    return (visitor as any)[this[ExpressionKind]](this as any, context);
  }
}

export namespace Expression {
  /**
   * Visitor for processing Expression Nodes.
   */
  export interface Visitor<T = any, C = undefined> {
    listIndex<Index extends List.Index>(listIndex: Index, context: C): T;
    listLength<Length extends List.Length>(listLength: Length, context: C): T;
    listMap<Map extends List.Map>(listMap: Map, context: C): T;
    literal<Lit extends Literal>(literal: Lit, context: C): T;
    reference<Ref extends Reference>(reference: Ref, context: C): T;
  }
  export namespace Visitor {
    export type GetThing<V extends Visitor> = V extends Visitor<infer T> ? T : never;
    export type GetContext<V extends Visitor> = V extends Visitor<any, infer C> ? C : never;
  }

  export namespace Guards {
    export function isListIndex(a: any): a is List.Index { return a[ExpressionKind] === 'listIndex'; }
    export function isListLength(a: any): a is List.Length { return a[ExpressionKind] === 'listLength'; }
    export function isListMap(a: any): a is List.Map { return a[ExpressionKind] === 'listMap'; }
    export function isLiteral(a: any): a is Literal { return a[ExpressionKind] === 'literal'; }
    export function isReference(a: any): a is Reference { return a[ExpressionKind] === 'reference'; }
  }
}

export class Literal<T extends ShapeOrRecord = any> extends Expression<T> {
  public readonly [ExpressionKind]: 'literal' = 'literal';
  constructor(public readonly type: T, public readonly value: Value.Of<T>) {
    super(type);
  }
}

export class Reference<T extends ShapeOrRecord = any, ID extends string = string> extends Expression<T> {
  public readonly [ExpressionKind]: 'reference' = 'reference';

  constructor(public readonly id: ID, type: T) {
    super(type);
  }
}
