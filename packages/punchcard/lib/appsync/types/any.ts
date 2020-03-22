import { AnyShape, UnknownShape } from '@punchcard/shape';
import { VObject } from './object';

export class VAny extends VObject<AnyShape> {}

export class VUnknown extends VObject<UnknownShape> {}