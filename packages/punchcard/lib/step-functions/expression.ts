import { ShapeOrRecord, Value } from '@punchcard/shape';
import { Thing } from './thing';
import { Variable } from './variable';

export const ExpressionKind = Symbol.for('@punchcard/lib/step-functions/expression.ExpressionKind');

/**
 * AST for defining Expressions which yield values.
 */
export abstract class Expression<T extends ShapeOrRecord = any> {
  public abstract readonly [ExpressionKind]: keyof Expression.Visitor;

  constructor(public readonly type: T) {}

  public visit<V extends Expression.Visitor>(visitor: V, context: Expression.Visitor.C<V>): Expression.Visitor.T<V> {
    return (visitor as any)[this[ExpressionKind]](this as any, context);
  }
}
export namespace Expression {
  /**
   * Visitor for processing Expression Nodes.
   */
  export interface Visitor<T = any, C = undefined> {
    literal<L extends Literal>(literal: L, context: C): T;
    reference<R extends Reference>(reference: R, context: C): T;
  }
  export namespace Visitor {
    export type T<V extends Visitor> = V extends Visitor<infer T> ? T : never;
    export type C<V extends Visitor> = V extends Visitor<any, infer C> ? C : never;
  }

  export namespace Guards {
    export function isLiteral(a: any): a is Literal { return a[ExpressionKind] === 'literal'; }
    export function isReference(a: any): a is Reference { return a[ExpressionKind] === 'literal'; }
  }
}

export class Literal<T extends ShapeOrRecord = any> extends Expression<T> {
  public readonly [ExpressionKind]: 'literal' = 'literal';
  constructor(public readonly type: T, public readonly value: Value.Of<T>) {
    super(type);
  }
}

export class Reference<T extends Thing = any> extends Expression<Thing.GetShape<T>> {
  public readonly [ExpressionKind]: 'reference' = 'reference';

  constructor(public readonly variable: Variable<any, T>) {
    super(variable)
  }
}
