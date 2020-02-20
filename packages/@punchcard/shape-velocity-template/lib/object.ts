import { boolean, integer, Shape, ShapeOrRecord } from '@punchcard/shape';
import { Expression, ExpressionOrLiteral } from './expression';
import { FunctionCall } from './function-call';
import { Node } from './node';
import { Bool, Integer } from './primitive';
import { ExpressionShape, NodeType, ObjectExpression } from './symbols';

/**
 * Root of the VTL type-system. Represents an object (value) in VTL.
 */
export class Object<T extends ShapeOrRecord = any> extends Node {
  public readonly [NodeType]: 'object' = 'object';

  /**
   * Expression that yielded this object.
   */
  public readonly [ObjectExpression]: Expression<T>;

  constructor(expressionNode: Expression<T>) {
    super();
    this[ObjectExpression] = expressionNode;
  }

  public hashCode(): Integer {
    return new Integer(new FunctionCall(this, 'hashCode', [], integer));
  }

  public equals(other: ExpressionOrLiteral<T>): Bool {
    return new Bool(new FunctionCall(this, 'equals', [other], boolean));
  }
}

export namespace Object {
  /**
   * Shape or Record type of the VTL Object.
   */
  export type Type<O extends Object> = O[ObjectExpression][ExpressionShape];
  /**
   * Shape of the VTL Object.
   */
  export type Shape<O extends Object> = Shape.Of<Type<O>>;
}