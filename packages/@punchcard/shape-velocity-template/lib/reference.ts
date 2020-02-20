import { ShapeOrRecord } from '@punchcard/shape';
import { Expression } from './expression';
import { NodeType } from './symbols';

export class Reference<T extends ShapeOrRecord = any> extends Expression<T> {
  public readonly [NodeType]: 'reference' = 'reference';

  constructor(type: T, public readonly id: string) {
    super(type);
  }
}