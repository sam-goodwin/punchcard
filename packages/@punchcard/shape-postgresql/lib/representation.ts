
import { BoolShape, IntegerShape, NumericShape, RecordType, ShapeOrRecord, StringShape, Value } from '@punchcard/shape';

export namespace Postgresql {
  export const Tag = Symbol.for('@punchcard/shape-postgresql');
  export type Tag = typeof Tag;

  export type Fields<T extends RecordType> = {
    [M in keyof T['members']]: Rep<T['members'][M]>;
  };

  export type Rep<T extends ShapeOrRecord = any> =
    T extends StringShape ? Text :
    T extends BoolShape ? Bool :
    T extends NumericShape ? Integer :
    T extends RecordType<infer I, infer M> ? Struct<T> & {
      [m in keyof M]: Rep<M[m]>;
    } :
    never
    ;
  export function rep<T extends ShapeOrRecord>(type: T): Rep<T> {
    throw new Error('todo');
  }
}

/**
 * Represents
 */
export class Rep<T extends ShapeOrRecord = any> {
  public equals(literal: Value.Of<T>): Bool;
  public equals(ref: this): Bool;
  public equals(value: any): Bool {
    throw new Error('todo');
  }
}

export class Text extends Rep<StringShape> {
  public like(like: string): Bool {

  }
}

export class Numeric<T extends NumericShape = any> extends Rep<T> {}

export class Integer extends Rep<IntegerShape> {}
export class Bool extends Rep<BoolShape> {
  public static and(...conditions: Bool[]): Bool {}
  public static or(...conditions: Bool[]): Bool {}

  public and(...conditions: Bool[]): Bool {

  }
  public or(...conditions: Bool[]): Bool {

  }
}

export class Struct<T extends RecordType> extends Rep<T> {
  public readonly fields: Postgresql.Fields<T>;
}
