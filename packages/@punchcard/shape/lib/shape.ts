import { Visitor } from './visitor';

/**
 * Root of the Shape type-system.
 */
export abstract class Shape {
  public readonly NodeType: 'shape' = 'shape';
  public abstract readonly Kind: keyof Visitor;

  public abstract visit<V extends Visitor>(visitor: V): any;
}

export const isShape = (a: any): a is Shape => a.NodeType === 'shape';
