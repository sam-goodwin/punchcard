import { bool, integer, StringShape } from '@punchcard/shape';
import { VBool } from './bool';
import { VInteger } from './numeric';
import { expr, type, VObject } from './object';

export class VString extends VObject<StringShape> {
  public toUpperCase(): VString {
    return new VString(this[type], this[expr].dot('toUpperCase()'));
  }

  public isNotEmpty(): VBool {
    return VBool.not(this.isEmpty());
  }

  public isEmpty(): VBool {
    return new VBool(bool, this[expr].dot('isEmpty()'));
  }

  public size(): VInteger {
    return new VInteger(integer, this[expr].dot('size()'));
  }
}