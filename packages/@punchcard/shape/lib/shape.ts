import { ClassShape, ShapeOrRecord } from './class';
import { Apply, Meta, Trait } from './metadata';
import { Value } from './value';
import { Visitor } from './visitor';

// Track this issue for the emitting of generic metadata by the TS compiler.
// https://github.com/Microsoft/TypeScript/issues/7169

/**
 * Root of the Shape type-system.
 */
export abstract class Shape {
  public readonly [Value.Tag]: any;

  public readonly NodeType: 'shape' = 'shape';

  public abstract readonly Kind: keyof Visitor;

  public visit<V extends Visitor<T, C>, T, C>(visitor: V, context: C): T {
    return visitor[this.Kind](this as any, context) as T;
  }

  public apply<T extends Trait<this, any>>(trait: T): Apply<this, Trait.GetData<T>> {
    return Meta.apply(this, trait[Trait.Data]);
  }
}

export namespace Shape {
  export type Of<T extends ShapeOrRecord> =
    T extends Shape ? T :
    T extends { members: infer M } & (new(v: any) => infer I) ? ClassShape<M extends {} ? M : never, I> :
    never;
}
