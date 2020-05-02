import { Apply, Decorated, Meta, Metadata, Trait } from './metadata';
import { PrimitiveShapes } from './primitive';
import { stringHashCode } from './util';
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

  public abstract readonly FQN: string | undefined;

  public abstract readonly Kind: keyof ShapeVisitor;

  public readonly [Decorated.Data]?: {} = {};

  public visit<V extends ShapeVisitor<T, C>, T, C>(visitor: V, context: C): T {
    return visitor[this.Kind](this as any, context) as T;
  }

  public apply<T extends Shape, Data extends Metadata>(trait: Trait<this extends T ? T : never, Data>): Apply<this, Data> {
    return Meta.apply(this, trait[Trait.Data]!) as Apply<this, Data>;
  }

  public equals(other: Shape): boolean {
    return this.Kind === other.Kind;
  }

  public hashCode(): number {
    return stringHashCode(this.Kind);
  }
}
export namespace Shape {
  export type Primitive = PrimitiveShapes;
}
