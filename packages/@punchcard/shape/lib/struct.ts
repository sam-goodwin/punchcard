import { RecordMembers } from './record';
import { Shape } from './shape';

export function struct<M extends RecordMembers>(members: M): StructShape<M> {
  return new StructShape(members);
}

export class StructShape<M extends RecordMembers = any> extends Shape {
  public Kind: 'structShape' = 'structShape';

  constructor(public readonly members: M) {
    super();
  }
}