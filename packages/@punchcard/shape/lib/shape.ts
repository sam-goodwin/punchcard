import { Apply, Meta, Trait } from './metadata';
import { RecordShape, RecordType, ShapeOrRecord } from './record';
import { Value } from './value';
import { ShapeVisitor } from './visitor';

// Track this issue for the emitting of generic metadata by the TS compiler.
// https://github.com/Microsoft/TypeScript/issues/7169

/**
 * Root of the Shape type-system.
 */
export abstract class Shape {
  public readonly [Value.Tag]: any;

  public readonly NodeType: 'shape' = 'shape';

  public abstract readonly Kind: keyof ShapeVisitor;

  public visit<V extends ShapeVisitor<T, C>, T, C>(visitor: V, context: C): T {
    return visitor[this.Kind](this as any, context) as T;
  }

  public apply<T extends Trait<this, any>>(trait: T): Apply<this, Trait.GetData<T>> {
    return Meta.apply(this, trait[Trait.Data]);
  }
}

export namespace Shape {
  export type Of<T extends ShapeOrRecord> =
    T extends RecordType<infer I, infer M> ? RecordShape<M extends {} ? M : never, I> :
    T extends Shape ? T :
    never
    ;
}
