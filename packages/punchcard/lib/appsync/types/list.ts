import { ArrayShape } from '@punchcard/shape';
import { Expression } from '../expression/expression';
import { VObject } from './object';

export class VList<T extends VObject = any> extends VObject<ArrayShape<VObject.ShapeOf<T>>> {
  constructor(shape: ArrayShape<VObject.ShapeOf<T>>, expression: Expression) {
    super(shape, expression);
  }
}