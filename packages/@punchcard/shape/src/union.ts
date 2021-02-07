import { Shape } from './shape';

export function union<T extends Shape[]>(...items: T): UnionShape<T>;
export function union<FQN extends string, T extends Shape[]>(fqn: FQN, ...items: T): UnionShape<T, FQN>;
export function union(a: any, ...b: any[]) {
  if (typeof a === 'string') {
    return new UnionShape(b, a);
  } else {
    return new UnionShape([a, ...b], undefined);
  }
}

export class UnionShape<T extends Shape[], FQN extends string | undefined = undefined> extends Shape {
  public readonly Kind: 'unionShape' = 'unionShape';

  constructor(
    public readonly Items: T,
    public readonly FQN: FQN = undefined as FQN
  ) {
    super();
  }
}

/**
 * @see https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type/50375286#50375286
 * @see https://github.com/Microsoft/TypeScript/issues/26058
 * @see https://github.com/Microsoft/TypeScript/issues/26058#issuecomment-456606942
 */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I)=>void) ? I : never;

export type DistributeUnionShape<T extends Shape> = T extends UnionShape<infer U> ?
  T | {
    [u in Extract<keyof U, number>]: DistributeUnionShape<U[u]>
  }[Extract<keyof U, number>] :
  T
;