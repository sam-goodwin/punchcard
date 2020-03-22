import { MapShape } from '@punchcard/shape';
import { VObject } from './object';

export class VMap<T extends VObject = any> extends VObject<MapShape<VObject.ShapeOf<T>>> {}