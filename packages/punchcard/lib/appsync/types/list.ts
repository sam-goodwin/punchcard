import { ArrayShape } from '@punchcard/shape';
import { VExpression } from '../syntax/expression';
import { type, VObject } from './object';

export class VList<T extends VObject = VObject> extends VObject<ArrayShape<T[typeof type]>> {
  constructor(shape: ArrayShape<T[typeof type]>, expression: VExpression) {
    super(shape, expression);
  }
}