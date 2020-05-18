import { Shape } from './shape';

export function union<T extends Shape[]>(...items: T) : UnionShape<T> {
  return new UnionShape(items);
}

export class UnionShape<T extends Shape[]> extends Shape {
  public readonly FQN: 'union' = 'union';
  public readonly Kind: 'unionShape' = 'unionShape';

  constructor(public readonly Items: T) {
    super();
  }
}

/**
 * @see https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type/50375286#50375286
 * @see https://github.com/Microsoft/TypeScript/issues/26058
 * @see https://github.com/Microsoft/TypeScript/issues/26058#issuecomment-456606942
 */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I)=>void) ? I : never;