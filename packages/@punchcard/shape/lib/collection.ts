import { Pointer } from './pointer';
import { Shape } from './shape';

/**
 * A Collection of Shapes.
 */
export abstract class CollectionShape<T extends Shape> extends Shape {
  public abstract readonly Kind: 'arrayShape' | 'setShape' | 'mapShape';

  constructor(public readonly Items: Pointer<T>) {
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
export const array = <T extends Shape>(items: Pointer<T>) => new ArrayShape(items) as ArrayShape<Pointer.Resolve<T>>;

/**
 * Set of unique itemss.
 */
export class SetShape<T extends Shape> extends CollectionShape<T> {
  // TODO: generate FQNs base on item type?
  public readonly FQN: 'set' = 'set';
  public readonly Kind = 'setShape';
}
export const set = <T extends Shape>(items: Pointer<T>) => new SetShape(items) as any as SetShape<Pointer.Resolve<T>>;

/**
 * Map of `string` keys to some shape, `T`.
 */
export class MapShape<T extends Shape> extends CollectionShape<T> {
  // TODO: generate FQNs base on item type?
  public readonly FQN: 'map' = 'map';
  public readonly Kind = 'mapShape';
}
export const map = <T extends Shape>(items: Pointer<T>) => new MapShape(items) as MapShape<Pointer.Resolve<T>>;
