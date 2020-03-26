import { SetShape } from '@punchcard/shape';
import { VExpression } from '../syntax/expression';
import { VObject } from './object';

export class VSet<T extends VObject = any> extends VObject<SetShape<VObject.ShapeOf<T>>> {
  constructor(shape: SetShape<VObject.ShapeOf<T>>, expression: VExpression) {
    super(shape, expression);
  }
}