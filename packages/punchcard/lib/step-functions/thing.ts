import sfn = require('@aws-cdk/aws-stepfunctions');

import { array, ArrayShape, BinaryShape, bool, BoolShape, DynamicShape, Equals, integer, IntegerShape, MapShape, NothingShape, number, NumberShape, NumericShape, RecordMembers, RecordShape, RecordType, SetShape, Shape, ShapeOrRecord, string, StringShape, TimestampShape, Value, Visitor as ShapeVisitor } from '@punchcard/shape';
import { Condition } from './choice';
import { Expression,  } from './expression';
import { List } from './list';
import { Expr, Kind, Path, Type } from './symbols';

// tslint:disable: no-construct

export const IsRef = Symbol.for('punchcard/lib/step-functions.IsRef');

export interface SFN<T extends Thing> extends Generator<unknown, T> {}

export class Thing<T extends ShapeOrRecord = any> {
  public readonly [Kind]: 'thing' = 'thing';
  public readonly [Expr]: Expression<T>;
  public readonly [Type]: T;

  constructor(expression: Expression<T>) {
    this[Expr] = expression;
    this[Type] = expression.type;
  }
}
export namespace Thing {
  export function getType<T extends ShapeOrRecord>(thing: Thing<T>): T {
    return thing[Type];
  }
  export function getExpression<T extends Thing>(thing: T): Expression<Thing.GetType<T>> {
    return thing[Expr];
  }

  export function of<T extends ShapeOrRecord>(type: T, expression: Expression<T>): Of<T> {
    return Shape.of(type).visit(visitor, expression);
  }

  export function DSL<T extends RecordType>(type: T): T & { new: (members: {
    [M in keyof T['members']]: Thing.Of<T['members'][M]>;
  }) => Thing.Of<T> } {
    return null as any;
  }

  export type Of<T extends ShapeOrRecord> = Shape.Of<T>[Tag];
  export type Literal<T extends ShapeOrRecord> = Value.Of<T>;
  export type GetType<T extends Thing> = T extends Thing<infer S> ? S : never;

  export class Visitor implements ShapeVisitor<Thing, Expression> {
    public arrayShape(shape: ArrayShape<any>, expression: Expression): List {
      return new List(expression);
    }
    public binaryShape(shape: BinaryShape, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
    public boolShape(shape: BoolShape, expression: Expression): Thing<any> {
      return new Bool(expression);
    }
    public recordShape(shape: RecordShape<any, any>, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
    public dynamicShape(shape: DynamicShape<any>, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
    public integerShape(shape: IntegerShape, expression: Expression): Integer {
      throw new Error("Method not implemented.");
    }
    public mapShape(shape: MapShape<any>, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
    public nothingShape(shape: NothingShape, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
    public numberShape(shape: NumberShape, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
    public setShape(shape: SetShape<any>, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
    public stringShape(shape: StringShape, expression: Expression): Thing<any> {
      return new String(expression);
    }
    public timestampShape(shape: TimestampShape, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
  }
  export const visitor = new Visitor();
}

const Tag = Symbol.for('punchcard/step-functions.DSL');
type Tag = typeof Tag;

declare module '@punchcard/shape/lib/shape' {
  interface Shape {
    [Tag]: Thing<any>;
  }
}
// tslint:disable: ban-types

declare module '@punchcard/shape/lib/primitive' {
  interface BoolShape {
    [Tag]: Bool;
  }
  interface StringShape {
    [Tag]: String;
  }
  // interface NumericShape {
  //   [Tag]: Integer | Number;
  // }
  interface IntegerShape {
    [Tag]: Integer;
  }
  interface NumberShape {
    [Tag]: Number;
  }
  interface TimestampShape {
    [Tag]: Timestamp;
  }
  interface NothingShape {
    [Tag]: Nothing;
  }
}
declare module '@punchcard/shape/lib/collection' {
  interface ArrayShape<T> {
    [Tag]: List<Thing.Of<T>>;
  }
}
declare module '@punchcard/shape/lib/record' {
  interface RecordShape<M, I> {
    [Tag]: MakeRecord<M, I>;
  }
}

export class Nothing extends Thing<NothingShape> {}

export class Ord<T extends Condition.Comparable> extends Thing<T> {
  public equals(value: Value.Of<T>): Condition.Equals<T> {
    return new Condition.Equals(this[Type], this as any, value);
  }
  public greaterThan(value: Value.Of<T>): Condition.Equals<T> {
    return new Condition.Equals(this[Type], this as any, value);
  }
}

export class String extends Ord<StringShape> {
  constructor(expression: Expression<StringShape>) {
    super(expression);
  }

  public get length(): Integer {
    throw new Error('todo');
  }
}
export class Timestamp extends Ord<TimestampShape> {

}
export class Numeric<N extends NumericShape> extends Ord<N> {}

export class Integer extends Numeric<IntegerShape> {
  constructor(expression: Expression<IntegerShape>) {
    super(expression);
  }
}
export class Number extends Numeric<NumberShape> {
  constructor(expression: Expression<NumberShape>) {
    super(expression);
  }
}
export class Bool extends Thing<BoolShape> implements Condition {
  constructor(expression: Expression<BoolShape>) {
    super(expression);
  }

  public toCondition(): sfn.Condition {
    throw new Error('todo');
    // todo: Epxression to condition...
    // return sfn.Condition.booleanEquals(this[Expr], true);
  }
}

export class Record<M extends RecordMembers, I> extends Thing<RecordShape<M, I>> {

}
export type MakeRecord<M extends RecordMembers, I> = Record<M, I> & {
  [m in keyof M]: Thing.Of<M[m]>;
};
