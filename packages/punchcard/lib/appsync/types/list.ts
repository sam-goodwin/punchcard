import { ArrayShape } from '@punchcard/shape';
import { VExpression } from '../syntax/expression';
import { VObject } from './object';

export class VList<T extends VObject = any> extends VObject<ArrayShape<VObject.ShapeOf<T>>> {
  constructor(shape: ArrayShape<VObject.ShapeOf<T>>, expression: VExpression) {
    super(shape, expression);
  }
}