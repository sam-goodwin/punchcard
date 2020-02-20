import { array, ArrayShape, integer, IntegerShape } from '@punchcard/shape';
import { Expression, ExpressionOrLiteral } from './expression';
import { FunctionCall } from './function-call';
import { Object } from './object';
import { Integer } from './primitive';
import { ExpressionShape, ItemShape, NodeType, ObjectExpression } from './symbols';
import { ToObjectVisitor } from './to-object-visitor';

/**
 * A List of values in VTL.
 */
export class List<T extends Object = any> extends Object<ArrayShape<Object.Shape<T>>> {
  public readonly [ItemShape]: Object.Shape<T>;

  constructor(expression: Expression<ArrayShape<Object.Shape<T>>>) {
    super(expression);
    this[ItemShape] = expression[ExpressionShape].Items;
  }

  public set(index: ExpressionOrLiteral<IntegerShape>, value: T): void {
    
  }

  public get(index: ExpressionOrLiteral<IntegerShape>): T {
    return this[ItemShape].visit(ToObjectVisitor.instance, new FunctionCall(this, 'get', [Expression.resolve(integer, index)], this[ItemShape])) as T;
  }

  public size(): Integer {
    return new Integer(new FunctionCall(this, 'size', [], integer));
  }
}
