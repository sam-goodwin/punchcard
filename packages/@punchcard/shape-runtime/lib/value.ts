import { AssertIsShape, BoolShape, ClassType, NumberShape, OptionalKeys, RequiredKeys, Shape, StringShape } from '@punchcard/shape';
import { HashSet } from './set';

export namespace Value {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-runtime.Value.Tag');

  export type Of<T extends {[Tag]: any} | ClassType> =
    T extends {[Tag]: infer T2} ? T2 :
    T extends ClassType ?
      Shape.Of<T> extends { [Tag]: infer T2; } ? T2 : never :
    never;
}

declare module '@punchcard/shape/lib/shape' {
  export interface Shape {
    [Value.Tag]: any;
  }
}

declare module '@punchcard/shape/lib/primitive' {
  export interface DynamicShape<T extends unknown | any> {
    [Value.Tag]: T;
  }
  export interface BoolShape {
    [Value.Tag]: boolean;
  }
  export interface BinaryShape {
    [Value.Tag]: Buffer;
  }
  export interface StringShape {
    [Value.Tag]: string;
  }
  export interface NothingShape {
    [Value.Tag]: null | undefined | void;
  }
  export interface NumberShape {
    [Value.Tag]: number;
  }
  export interface IntegerShape {
    [Value.Tag]: number;
  }
  export interface TimestampShape {
    [Value.Tag]: Date;
  }
}

declare module '@punchcard/shape/lib/collection' {
  export interface ArrayShape<T extends Shape> {
    [Value.Tag]: Array<T[Value.Tag]>;
  }
  export interface SetShape<T extends Shape> {
    [Value.Tag]: T extends StringShape | NumberShape | BoolShape ? Set<T[Value.Tag]> : HashSet<T>;
  }
  export interface MapShape<T extends Shape> {
    [Value.Tag]: {
      [key: string]: T[Value.Tag];
    };
  }
}

declare module '@punchcard/shape/lib/class' {
  export interface ClassShape<C extends ClassType> {
    [Value.Tag]: {
      [member in RequiredKeys<this['Members']>]: this['Members'][member]['Type'][Value.Tag];
    } & {
      [member in OptionalKeys<this['Members']>]+?: this['Members'][member]['Type'][Value.Tag];
    };
  }
}
