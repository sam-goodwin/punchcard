import { SetShape } from '@punchcard/shape';
import { Expression } from '../expression/expression';
import { VObject } from './object';

export class VSet<T extends VObject = any> extends VObject<SetShape<VObject.ShapeOf<T>>> {
  constructor(shape: SetShape<VObject.ShapeOf<T>>, expression: Expression) {
    super(shape, expression);
  }
}