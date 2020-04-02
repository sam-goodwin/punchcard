import { SetShape } from '@punchcard/shape';
import { VExpression } from '../syntax/expression';
import { type, VObject } from './object';

export class VSet<T extends VObject = VObject> extends VObject<SetShape<T[typeof type]>> {
  constructor(shape: SetShape<T[typeof type]>, expression: VExpression) {
    super(shape, expression);
  }
}