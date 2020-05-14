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
export namespace UnionShape {
  // sometimes we can't properly map Unions right now, so we gotta have explicit indices to Extract
  // make larger as necessary. Union should probably end up being using sparingly?
  // issue can potentially arise in computed types.
  export type Indices = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
}
