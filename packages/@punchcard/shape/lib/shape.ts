import { Visitor } from './visitor';

/**
 * Root of the Shape type-system.
 */
export abstract class Shape {
  public readonly NodeType: 'shape' = 'shape';
  public abstract readonly Kind: keyof Visitor;

  public visit<V extends Visitor>(visitor: V): ReturnType<V[this['Kind']]> {
    return visitor[this.Kind](this as any) as ReturnType<V[this['Kind']]>;
  }
}

export const isShape = (a: any): a is Shape => a.NodeType === 'shape';
