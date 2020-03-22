import { IntegerShape, NumberShape } from '@punchcard/shape';
import { VObject } from './object';

export class VInteger extends VObject<IntegerShape> {}

export class VNumber extends VObject<NumberShape> {}