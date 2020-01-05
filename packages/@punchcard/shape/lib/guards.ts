import { ClassShape } from './class';
import { ArrayShape, MapShape, SetShape } from './collection';
import { NumberShape, StringShape, TimestampShape } from './primitive';
import { Shape } from './shape';

export namespace ShapeGuards {
  export const isArrayShape = (a: any): a is ArrayShape<any> => a.Kind === 'arrayShape';
  export const isClassShape = (a: any): a is ClassShape<any> => isShape(a) && a.Kind === 'classShape';
  export const isMapShape = (a: any): a is MapShape<any> => a.Kind === 'mapShape';
  export const isNumberShape = (a: any): a is NumberShape => isShape(a) && a.Kind === 'numberShape';
  export const isSetShape = (a: any): a is SetShape<any> => a.Kind === 'setShape';
  export const isShape = (a: any): a is Shape => a.NodeType === 'shape';
  export const isStringShape = (a: any): a is StringShape => isShape(a) && a.Kind === 'stringShape';
  export const isTimestampShape = (a: any): a is TimestampShape => isShape(a) && a.Kind === 'timestampShape';

  export type IsArrayShape<T> = T extends ArrayShape<any> ? T : never;
  export type IsClassShape<T> = T extends ClassShape<any> ? T : never;
  export type IsMapShape<T> = T extends MapShape<any> ? T : never;
  export type IsNumberShape<T> = T extends NumberShape ? T : never;
  export type IsSetShape<T> = T extends SetShape<any> ? T : never;
  export type IsShape<T> = T extends Shape ? T : never;
  export type IsStringShape<T> = T extends StringShape ? T : never;
  export type IsTimestampShape<T> = T extends TimestampShape ? T : never;
}

export namespace MetadataGuards {
  const a = '';
  // to be augmented by supplemental libraries
}