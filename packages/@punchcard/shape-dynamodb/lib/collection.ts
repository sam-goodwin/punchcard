import { NumberShape, StringShape } from '@punchcard/shape/lib/primitive';
import { Shape } from '@punchcard/shape/lib/shape';
import { AttributeValue } from './attribute';
import { DSL } from './dsl';

declare module '@punchcard/shape/lib/collection' {
  export interface ArrayShape<T extends Shape> {
    [AttributeValue.Tag]: AttributeValue.List<T>;
    [DSL.Tag]: DSL.List<T> & { [index: number]: DSL.Of<T>; };
  }
  export interface SetShape<T extends Shape> {
    [AttributeValue.Tag]:
      T extends StringShape ? AttributeValue.StringSet :
      T extends NumberShape ? AttributeValue.NumberSet :
      never;

    [DSL.Tag]:
      T extends StringShape | NumberShape ? DSL.Set<T> :
      never;
  }
  export interface MapShape<T extends Shape> {
    [AttributeValue.Tag]: AttributeValue.Map<T>;
    [DSL.Tag]: DSL.Map<T> & { [key: string]: DSL.Of<T>; };
  }
}
