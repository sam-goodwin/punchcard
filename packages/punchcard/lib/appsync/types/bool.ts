import { bool, BoolShape } from '@punchcard/shape';
import { expr, VObject } from './object';

export class VBool extends VObject<BoolShape> {
  public static not(a: VBool): VBool {
    return new VBool(bool, a[expr].prepend('!'));
  }
}