import { RecordType, Shape, ShapeOrRecord } from '@punchcard/shape';
import { List } from './list';
import { Object } from './object';
import { Bool, Integer, Nothing, Number, Numeric, String, } from './primitive';
import { MakeRecordObject } from './record';
import { Instance } from './symbols';

/**
 * Velocity Template Language (VTL) Domain-Specific Language.
 */
export const Value = Symbol.for('VTL.Value');
export type DSL<T> = T extends {[Instance]: infer V} ? V : T extends RecordType ? Shape.Of<T>[Instance] : never;

export function dsl<T extends ShapeOrRecord>(type: T): DSL<T> {
  return 'todo' as any;
}

/**
 * Velocity Template Language (VTL) Domain-Specific Language.
 */
/**
 * Construct a Record Type with VTL.
 *
 * @param members mappings for each member in the Record.
 */
export function Dynamic<M extends { [member: string]: Object; }>(members: M): MakeRecordObject<RecordType<{
  [m in keyof M]: Object.Shape<M[m]>;
}>> {
  return null as any;
}

export function Factory<T extends RecordType>(type: T): {
  VTL: (value: {
    [M in keyof T['members']]: DSL<T['members'][M]>;
  }) => DSL<T>
} {
  return {
    VTL: () => {
      return null as any;
    }
  };
}
export function Of<T extends RecordType>(type: T, value: {
  [M in keyof T['members']]: DSL<T['members'][M]>;
}): DSL<T> {
  return Factory(type).VTL(value);
}

declare module '@punchcard/shape/lib/shape' {
  interface Shape {
    [Instance]: Object;
  }
}

declare module '@punchcard/shape/lib/primitive' {
  interface NothingShape {
    [Instance]: Nothing;
  }
  interface BoolShape {
    [Instance]: Bool;
  }
  interface NumericShape {
    [Instance]: Numeric<any>;
  }
  interface IntegerShape {
    [Instance]: Integer;
  }
  interface NumberShape {
    [Instance]: Number;
  }
  interface StringShape {
    [Instance]: String;
  }
  interface TimestampShape {
    [Instance]: String;
  }
}

declare module '@punchcard/shape/lib/collection' {
  interface ArrayShape<T> {
    [Instance]: List<DSL<T>>;
  }
}

declare module '@punchcard/shape/lib/record' {
  interface RecordShape<M, I> {
    [Instance]: MakeRecordObject<this['Type']>;
  }
}
