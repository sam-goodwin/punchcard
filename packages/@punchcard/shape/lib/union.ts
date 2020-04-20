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
