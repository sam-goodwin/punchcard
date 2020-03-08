import { HashSet } from './hash-set';
import { BoolShape, NumberShape, StringShape } from './primitive';
import { ShapeOrRecord } from './record';
import { Shape } from './shape';
import { Value } from './value';

/**
 * A Collection of Shapes.
 */
export abstract class CollectionShape<T extends Shape> extends Shape {
  public abstract readonly Kind: 'arrayShape' | 'setShape' | 'mapShape';

  constructor(public readonly Items: T) {
    super();
  }
}

/**
 * Array of Shapes.
 */
export class ArrayShape<T extends Shape> extends CollectionShape<T> {
  public readonly [Value.Tag]: Value.Of<T>[];
  public readonly Kind = 'arrayShape';
}
export const array = <T extends ShapeOrRecord>(items: T) => new ArrayShape(Shape.of(items)) as ArrayShape<Shape.Of<T>>;

/**
 * Set of unique itemss.
 */
export class SetShape<T extends Shape> extends CollectionShape<T> {
  public readonly [Value.Tag]: T extends StringShape | NumberShape | BoolShape ? Set<T[Value.Tag]> : HashSet<T>;
  public readonly Kind = 'setShape';
}
export const set = <T extends ShapeOrRecord>(items: T) => new SetShape(Shape.of(items)) as any as SetShape<Shape.Of<T>>;

/**
 * Map of `string` keys to some shape, `T`.
 */
export class MapShape<T extends Shape> extends CollectionShape<T> {
  public readonly [Value.Tag]: {
    [key: string]: Value.Of<T>;
  };

  public readonly Kind = 'mapShape';
}
export const map = <T extends ShapeOrRecord>(items: T) => new MapShape(Shape.of(items)) as MapShape<Shape.Of<T>>;
