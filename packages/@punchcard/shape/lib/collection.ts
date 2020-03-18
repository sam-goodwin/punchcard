import { Shape } from './shape';

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
  public readonly Kind = 'arrayShape';
}
export const array = <T extends Shape.Like>(items: T) => new ArrayShape(Shape.resolve(items)) as ArrayShape<Shape.Resolve<T>>;

/**
 * Set of unique itemss.
 */
export class SetShape<T extends Shape> extends CollectionShape<T> {
  public readonly Kind = 'setShape';
}
export const set = <T extends Shape.Like>(items: T) => new SetShape(Shape.resolve(items)) as any as SetShape<Shape.Resolve<T>>;

/**
 * Map of `string` keys to some shape, `T`.
 */
export class MapShape<T extends Shape> extends CollectionShape<T> {
  public readonly Kind = 'mapShape';
}
export const map = <T extends Shape.Like>(items: T) => new MapShape(Shape.resolve(items)) as MapShape<Shape.Resolve<T>>;
