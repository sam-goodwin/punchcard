import sfn = require('@aws-cdk/aws-stepfunctions');

import { array, ArrayShape, BinaryShape, bool, BoolShape, DynamicShape, Equals, integer, IntegerShape, MapShape, NothingShape, number, NumberShape, NumericShape, RecordMembers, RecordShape, RecordType, SetShape, Shape, ShapeOrRecord, string, StringShape, TimestampShape, Value, Visitor as ShapeVisitor } from '@punchcard/shape';
import { Condition } from './choice';
import { ForEach } from './control';
import { Expression } from './expression';
import { Expr, Kind, Path, Type } from './symbols';

// tslint:disable: no-construct

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
  export type GetShape<T extends Thing> = T extends Thing<infer S> ? S : never;

  export class Visitor implements ShapeVisitor<Thing, Expression> {
    arrayShape(shape: ArrayShape<any>, expression: Expression): List {
      return new List(shape.Items, path);
    }
    binaryShape(shape: BinaryShape, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
    boolShape(shape: BoolShape, expression: Expression): Thing<any> {
      return new Bool(path);
    }
    recordShape(shape: RecordShape<any, any>, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
    dynamicShape(shape: DynamicShape<any>, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
    integerShape(shape: IntegerShape, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
    mapShape(shape: MapShape<any>, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
    nothingShape(shape: NothingShape, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
    numberShape(shape: NumberShape, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
    setShape(shape: SetShape<any>, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
    stringShape(shape: StringShape, expression: Expression): Thing<any> {
      return new String(path);
    }
    timestampShape(shape: TimestampShape, expression: Expression): Thing<any> {
      throw new Error("Method not implemented.");
    }
  }
  export const visitor = new Visitor();
}

const Tag = Symbol.for('punchcard/step-functions.DSL');
type Tag = typeof Tag;

declare module '@punchcard/shape/lib/shape' {
  interface Shape {
    [Tag]: Thing<this>;
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
  interface IntegerShape {
    [Tag]: Integer;
  }
  interface NumberShape {
    [Tag]: Number;
  }
  interface TimestampShape {
    [Tag]: Timestamp;
  }
}
declare module '@punchcard/shape/lib/collection' {
  interface ArrayShape<T> {
    [Tag]: List<Thing.Of<T>> & {
      [index: number]: Thing.Of<T>;
    }
  }
}
declare module '@punchcard/shape/lib/record' {
  interface RecordShape<M, I> {
    [Tag]: MakeRecord<M, I>;
  }
}

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
    super(expression, string);
  }
}
export class Timestamp extends Ord<TimestampShape> {

}
export class Numeric<N extends NumericShape> extends Ord<N> {}

export class Integer extends Numeric<IntegerShape> {
  constructor(expression: Expression<IntegerShape>) {
    super(integer, path);
  }
}
export class Number extends Numeric<NumberShape> {
  constructor(expression: Expression<NumberShape>) {
    super(number, path);
  }
}
export class Bool extends Thing<BoolShape> implements Condition {
  constructor(expression: Expression<BoolShape>) {
    super(bool, path);
  }

  public toCondition(): sfn.Condition {
    return sfn.Condition.booleanEquals(this[Path], true);
  }
}

export class List<T extends Thing = any> extends Thing<ArrayShape<Thing.GetShape<T>>> {
  constructor(item: Thing.GetShape<T>, path: string) {
    super(array(item) as any, path);
  }

  public get(index: number): T {
    return this[Type].Items.visit(Thing.visitor, this[Path] + `[${index}]`);
  }

  public Filter(fn: (item: T) => Bool | Condition): List._<Timestamp> {
    return null as any;
  }

  public Map<U extends Thing>(fn: (item: T) => U): List._<U> {
    const item = fn(this[Type].Items.visit(Thing.visitor, this[Path]));
    return this[Type].Items.visit(Thing.visitor, item[Path]);
  }

  public ForEach(fn: (item: T) => void): void {
    return ForEach(this, fn);
  }

  public Length(): Integer {
    return new Integer(this[Path] + '.length()');
  }
}
export namespace List {
  export type _<I extends Thing> = List<I> & { [index: number]: I; };
}

export class Record<M extends RecordMembers, I> extends Thing<RecordShape<M, I>> {

}
export type MakeRecord<M extends RecordMembers, I> = Record<M, I> & {
  [m in keyof M]: Thing.Of<M[m]>;
};

const a = array(string);

const t = Thing.of(a);
