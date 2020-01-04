import { ClassShape, ClassType } from './class';
import { Visitor } from './visitor';

/**
 * Root of the Shape type-system.
 */
export abstract class Shape {
  public static of<T extends Shape | ClassType>(items: T): Shape.Of<T> {
    return isShape(items) ? items as Shape.Of<T> : ClassShape.forClassType(items as ClassType) as Shape.Of<T>;
  }

  public readonly NodeType: 'shape' = 'shape';
  public abstract readonly Kind: keyof Visitor;

  public visit<V extends Visitor>(visitor: V): ReturnType<V[this['Kind']]> {
    return visitor[this.Kind](this as any) as ReturnType<V[this['Kind']]>;
  }
}
export namespace Shape {
  export type Of<T extends Shape | ClassType> = T extends ClassType<any> ? ClassShape<T> : T;
}
export const isShape = (a: any): a is Shape => a.NodeType === 'shape';
