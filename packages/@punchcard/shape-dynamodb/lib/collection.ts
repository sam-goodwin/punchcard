import { NumberShape, StringShape } from '@punchcard/shape/lib/primitive';
import { Shape } from '@punchcard/shape/lib/shape';
import { AttributeValue, Tag } from './attribute';

declare module '@punchcard/shape/lib/collection' {
  export interface ArrayShape<T extends Shape> {
    [Tag]: AttributeValue.List<T[Tag]>;
  }
  export interface SetShape<T extends Shape> {
    [Tag]:
      T extends StringShape ? AttributeValue.StringSet :
      T extends NumberShape ? AttributeValue.NumberSet :
      never;
  }
  export interface MapShape<T extends Shape> {
    [Tag]: AttributeValue.Map<T[Tag]>;
  }
}
