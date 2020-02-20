import { nothing as _nothing, Shape, ShapeOrRecord, Value } from '@punchcard/shape';
import { Literal } from './literal';
import { Node } from './node';
import { Object } from './object';
import { ExpressionShape as ExpressionShape, NodeType } from './symbols';
import { ToObjectVisitor } from './to-object-visitor';
import { Frame } from './visitor';

/**
 * Expression is an AST node that represents a value of some Shape.
 */
export abstract class Expression<T extends ShapeOrRecord = any> extends Node {
  public abstract readonly [NodeType]: keyof Node.Visitor;
  /**
   * Shape/Record type of data yielded by this expression.
   */
  public readonly [ExpressionShape]: T;

  constructor(expressionShape: T) {
    super();
    this[ExpressionShape] = expressionShape;
  }
}

export namespace Expression {
  export function resolve<T extends ShapeOrRecord>(type: T, expr: ExpressionOrLiteral<T>): DSL<T> {
    const shape = Shape.of(type);
    if (Node.Guards.isExpression(expr)) {
      return shape.visit(ToObjectVisitor.instance, expr as any) as any;
    } else {
      return shape.visit(ToObjectVisitor.instance, new Literal(shape, expr as any)) as any;
    }
  }
  /**
   * Union of possible expression types.
   */
  export type Type<T extends Shape> = Literal<T>;
}

/**
 * Either an expression or literal value that yields a type of T.
 */
export type ExpressionOrLiteral<T extends ShapeOrRecord> = Object<T> | Value.Of<T>;

export class NothingExpression extends Expression<any> {
  public readonly [NodeType]: 'nothing' = 'nothing';

  public render(frame: Frame): string {
    return "";
  }
}

export namespace Expression {
  export const nothing = new NothingExpression(_nothing);
}
