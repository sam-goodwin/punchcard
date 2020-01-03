import { AST } from "./ast";
import { Visitor } from "./visitor";

/**
 * Root of the Shape type-system.
 */
export abstract class Shape {
  public static isNode = AST.is<Shape>('shape');

  public readonly NodeType: 'shape' = 'shape';
  public abstract readonly Kind: string;

  public visit(visitor: Visitor): void {
    return visitor.shape(this);
  }
}
