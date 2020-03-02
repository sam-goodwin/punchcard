import { RecordMembers } from './record';
import { Shape } from './shape';
import { Value } from './value';

export function struct<M extends RecordMembers>(members: M): StructShape<M> {
  return new StructShape(members);
}

export class StructShape<M extends RecordMembers> extends Shape {
  public readonly Kind: 'structShape' = 'structShape';

  public readonly [Value.Tag]: {
    [m in keyof M]: Value.Of<M[m]>;
  };

  constructor(public readonly members: M) {
    super();
  }
}