import { Pointer } from './pointer';
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
  // TODO: generate FQNs base on item type?
  public readonly FQN: 'array' = 'array';
  public readonly Kind = 'arrayShape';
}
export const array = <T extends Shape>(items: T) => new ArrayShape(items) as ArrayShape<T>;

/**
 * Set of unique itemss.
 */
export class SetShape<T extends Shape> extends CollectionShape<T> {
  // TODO: generate FQNs base on item type?
  public readonly FQN: 'set' = 'set';
  public readonly Kind = 'setShape';
}
export const set = <T extends Shape>(items: T) => new SetShape(items) as any as SetShape<T>;

/**
 * Map of `string` keys to some shape, `T`.
 */
export class MapShape<T extends Shape> extends CollectionShape<T> {
  // TODO: generate FQNs base on item type?
  public readonly FQN: 'map' = 'map';
  public readonly Kind = 'mapShape';
}
export const map = <T extends Shape>(items: T) => new MapShape(items) as MapShape<T>;
