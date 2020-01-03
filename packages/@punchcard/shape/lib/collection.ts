import { Shape } from "./shape";

/**
 * A Collection of Shapes.
 */
export abstract class CollectionShape<T extends Shape> extends Shape {
  public abstract readonly Kind: 'arrayShape' | 'setShape' | 'mapShape';

  constructor(public readonly items: T) {
    super();
  }
}

/**
 * Array of Shapes.
 */
export class ArrayShape<T extends Shape> extends CollectionShape<T> {
  public readonly Kind = 'arrayShape';
}
export function array<T extends Shape>(items: T): ArrayShape<T> {
  return new ArrayShape(items);
}

/**
 * Set of unique itemss.
 */
export class SetShape<T extends Shape> extends CollectionShape<T> {
  public readonly Kind = 'setShape';
}
export function set<T extends Shape>(items: T): SetShape<T> {
  return new SetShape(items);
}

/**
 * Map of `string` keys to some shape, `T`.
 */
export class MapShape<T extends Shape> extends CollectionShape<T> {
  public readonly Kind = 'mapShape';
}
export function map<T extends Shape>(items: T): MapShape<T> {
  return new MapShape(items);
}
