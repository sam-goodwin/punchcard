
import { BoolShape, NumberShape, OptionalKeys, RequiredKeys, StringShape } from '@punchcard/shape';
import { ClassType } from '@punchcard/shape/lib/class';
import { Shape } from '@punchcard/shape/lib/shape';
import { HashSet } from './set';

export namespace Runtime {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-runtime.Tag');

  export type Of<T extends {[Tag]: any}> = T extends {[Tag]: infer T2} ? T2 : never;
  // export type OfClass<T extends ClassType> = Of<ClassShape<T>>
  export type OfType<T extends ClassType> = Of<Shape.Of<T>>;
}

declare module '@punchcard/shape/lib/shape' {
  export interface Shape {
    [Runtime.Tag]: any;
  }
}

declare module '@punchcard/shape/lib/primitive' {
  export interface BoolShape {
    [Runtime.Tag]: boolean;
  }
  export interface StringShape {
    [Runtime.Tag]: string;
  }
  export interface NumberShape {
    [Runtime.Tag]: number;
  }
  export interface TimestampShape {
    [Runtime.Tag]: Date;
  }
}

declare module '@punchcard/shape/lib/collection' {
  export interface ArrayShape<T extends Shape> {
    [Runtime.Tag]: Array<T[Runtime.Tag]>;
  }
  export interface SetShape<T extends Shape> {
    [Runtime.Tag]: T extends StringShape | NumberShape | BoolShape ? Set<T[Runtime.Tag]> : HashSet<T>;
  }
  export interface MapShape<T extends Shape> {
    [Runtime.Tag]: {
      [key: string]: T[Runtime.Tag];
    };
  }
}

declare module '@punchcard/shape/lib/class' {
  export interface ClassShape<C extends ClassType> {
    [Runtime.Tag]: {
      [member in RequiredKeys<this['Members']>]: this['Members'][member]['Type'][Runtime.Tag];
    } & {
      [member in OptionalKeys<this['Members']>]+?: this['Members'][member]['Type'][Runtime.Tag];
    };
  }
}
