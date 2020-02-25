import sfn = require('@aws-cdk/aws-stepfunctions');

import { BoolShape, NumericShape, ShapeGuards, StringShape, TimestampShape, Value } from '@punchcard/shape';

import { Scope } from './scope';
import { Statement } from './statement';
import { Thing } from './thing';

export function $if<T = void>(condition: Condition, then: (scope: Scope) => Generator<unknown, T>, elseIf: If<T> | Else<T>): Generator<unknown, T> {
  return Scope.block(scope => new If(elseIf, condition, then(scope), scope));
}

export function $elseIf<T>(condition: Condition, then: (scope: Scope) => Generator<unknown, T>, elseIf: If<T> | Else<T>): If<T> | Else<T> {

}

export function $else<T>(then: (scope: Scope) => Generator<unknown, T>): Else<T> {
  
}

export class If<T = any> extends Statement {
  public readonly kind: 'branch' = 'branch';

  public readonly next?: If<T> | Else<T>;

  constructor(
      public readonly parent: If<T> | undefined,
      public readonly condition: Condition,
      public readonly result: T,
      public readonly scope: Scope) {
    super(scope);
    if (parent) {
      if (parent.next) {
        throw new Error(`branch already has a child`);
      }
      (parent as any).next = this;
    }
  }

  public $elseIf(condition: Condition, then: (scope: Scope) => T): If<T> {
    return $if(condition, then, this);
  }

  public $else(then: (scope: Scope) => T): T {
    return Scope.block(scope => {
      const t = then(scope);
      new Else(this, t, scope);
      return t;
    });
  }
}

export class Else<T> {
  constructor(public readonly parent: If, public readonly result: T, public readonly scope: Scope) {
    if (parent.next) {
      throw new Error(`branch already has a child`);
    }
    (parent as any).next = this;
  }
}

export interface Condition {
  toCondition(): sfn.Condition;
}
export namespace Condition {
  export function and(...conditions: Condition[]): And {
    return new And(conditions);
  }
  export function or(...conditions: Condition[]): Or {
    return new Or(conditions);
  }

  export class And implements Condition {
    constructor(public readonly conditions: Condition[]) {}

    public toCondition(): sfn.Condition {
      return sfn.Condition.and(...this.conditions.map(c => c.toCondition()));
    }
  }

  export class Or implements Condition {
    constructor(public readonly conditions: Condition[]) {}

    public toCondition(): sfn.Condition {
      return sfn.Condition.or(...this.conditions.map(c => c.toCondition()));
    }
  }

  export type Comparable = BoolShape | StringShape | TimestampShape | NumericShape;

  export class Equals<T extends Comparable> implements Condition {
    constructor(public readonly shape: T, public readonly thing: Thing.Of<T>, public readonly value: Value.Of<T>) {}

    public toCondition(): sfn.Condition {
      if (ShapeGuards.isStringShape(this.shape)) {
        return sfn.Condition.stringEquals(this.thing., this.value.toString());
      } else if (ShapeGuards.isTimestampShape(this.shape)) {
        return sfn.Condition.timestampEquals(this.thing.id, (this.value as Date).toISOString());
      } else if (ShapeGuards.isNumericShape(this.shape)) {
        return sfn.Condition.numberEquals(this.thing.id, this.value as number);
      } else if (ShapeGuards.isBoolShape(this.shape)) {
        return sfn.Condition.booleanEquals(this.thing.id, this.value as boolean);
      } else {
        throw new Error(`can not compare equality of type: ${this.shape.Kind}`);
      }
    }
  }
}
