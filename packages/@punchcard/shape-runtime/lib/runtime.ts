
import { ClassShape, ClassType } from '@punchcard/shape/lib/class';
import { Shape } from '@punchcard/shape/lib/shape';

export namespace Runtime {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-runtime.Tag');

  export type Of<T extends {[Tag]: any}> = Omit<T, Tag>;
  export type OfType<T> = Of<ClassShape<ClassType<T>>>;
}

declare module '@punchcard/shape/lib/shape' {
  export interface Shape {
    [Runtime.Tag]: any;
  }
}

declare module '@punchcard/shape/lib/primitive' {
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
    [Runtime.Tag]: Set<T[Runtime.Tag]>;
  }
  export interface MapShape<T extends Shape> {
    [Runtime.Tag]: { [key: string]: T[Runtime.Tag] };
  }
}

declare module '@punchcard/shape/lib/class' {
  export interface ClassShape<C extends ClassType> {
    [Runtime.Tag]: {
      [member in keyof this['Members']]: Runtime.Of<this['Members'][member]['Type']>
    }
  }
}
