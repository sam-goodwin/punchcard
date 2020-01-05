import { NumberShape, StringShape } from '@punchcard/shape/lib/primitive';
import { Shape } from '@punchcard/shape/lib/shape';
import { AttributeValue } from './attribute';
import { Query } from './query';

declare module '@punchcard/shape/lib/collection' {
  export interface ArrayShape<T extends Shape> {
    [AttributeValue.Tag]: AttributeValue.List<T[AttributeValue.Tag]>;
    [Query.Tag]: Query.List<T>;
  }
  export interface SetShape<T extends Shape> {
    [AttributeValue.Tag]:
      T extends StringShape ? AttributeValue.StringSet :
      T extends NumberShape ? AttributeValue.NumberSet :
      never;
  }
  export interface MapShape<T extends Shape> {
    [AttributeValue.Tag]: AttributeValue.Map<T[AttributeValue.Tag]>;
    [Query.Tag]: Query.Map<T>;
  }
}
