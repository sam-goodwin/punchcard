import { ClassShape } from './class';
import { ArrayShape, MapShape, SetShape } from './collection';
import { Member } from './member';
import { BoolShape, NumberShape, StringShape, TimestampShape } from './primitive';
import { Shape } from './shape';

export namespace ShapeGuards {
  export const isArrayShape = (a: any): a is ArrayShape<any> => a.Kind === 'arrayShape';
  export const assertArrayShape = (a: any): asserts a is ArrayShape<any> => {
    if (!isArrayShape(a)) {
      throw new Error(`a is not of type: ArrayShape`);
    }
  };
  export const isBoolShape = (a: any): a is BoolShape => isShape(a) && a.Kind === 'boolShape';
  export const assertBoolShape = (a: any): asserts a is BoolShape => {
    if (!isBoolShape(a)) {
      throw new Error(`a is not of type: BoolShape`);
    }
  };
  export const isClassShape = (a: any): a is ClassShape<any> => isShape(a) && a.Kind === 'classShape';
  export const assertClassShape = (a: any): asserts a is ClassShape<any> => {
    if (!isClassShape(a)) {
      throw new Error(`a is not of type: ClassShape`);
    }
  };
  export const isMapShape = (a: any): a is MapShape<any> => a.Kind === 'mapShape';
  export const assertMapShape = (a: any): asserts a is MapShape<any> => {
    if (!isMapShape(a)) {
      throw new Error(`a is not of type: MapShape`);
    }
  };
  export const isNumberShape = (a: any): a is NumberShape => isShape(a) && a.Kind === 'numberShape';
  export const assertNumberShape = (a: any): asserts a is NumberShape => {
    if (!isNumberShape(a)) {
      throw new Error(`a is not of type: NumberShape`);
    }
  };
  export const isSetShape = (a: any): a is SetShape<any> => a.Kind === 'setShape';
  export const assertSetShape = (a: any): asserts a is SetShape<any> => {
    if (!isSetShape(a)) {
      throw new Error(`a is not of type: SetShape`);
    }
  };
  export const isShape = (a: any): a is Shape => a.NodeType === 'shape';
  export const assertShape = (a: any): asserts a is Shape => {
    if (!isShape(a)) {
      throw new Error(`a is not of type: Shape`);
    }
  };
  export const isStringShape = (a: any): a is StringShape => isShape(a) && a.Kind === 'stringShape';
  export const assertStringShape = (a: any): asserts a is StringShape => {
    if (!isStringShape(a)) {
      throw new Error(`a is not of type: StringShape`);
    }
  };
  export const isTimestampShape = (a: any): a is TimestampShape => isShape(a) && a.Kind === 'timestampShape';
  export const assertTimestampShape = (a: any): asserts a is TimestampShape => {
    if (!isTimestampShape(a)) {
      throw new Error(`a is not of type: TimestampShape`);
    }
  };

  export type IsArrayShape<T> = T extends ArrayShape<any> ? T : never;
  export type IsClassShape<T> = T extends ClassShape<any> ? T : never;
  export type IsMapShape<T> = T extends MapShape<any> ? T : never;
  export type IsNumberShape<T> = T extends NumberShape ? T : never;
  export type IsSetShape<T> = T extends SetShape<any> ? T : never;
  export type IsShape<T> = T extends Shape ? T : never;
  export type IsStringShape<T> = T extends StringShape ? T : never;
  export type IsTimestampShape<T> = T extends TimestampShape ? T : never;

  export const isMember = (a: any): a is Member => Member.isInstance(a);
  export const assertMember = (a: any): asserts a is Member => {
    if (!(Member.isInstance(a)))  {
      throw new Error(`${a} is not of type Member`);
    }
  };
}

export namespace MetadataGuards {
  const a = '';
  // to be augmented by supplemental libraries
}