import sfn = require('@aws-cdk/aws-stepfunctions');

import { BoolShape, NumericShape, ShapeGuards, StringShape, TimestampShape, Value } from '@punchcard/shape';

import { Scope } from './scope';
import { Statement } from './statement';
import { Thing } from './thing';

abstract class Block extends Statement {
  constructor(then: (scope: Scope) => any, scope?: Scope) {
    scope = scope || Thread.get();
    super(scope!.push());
    then(scope!);
    scope!.pop();
  }
}

export class Branch extends Block {
  public readonly kind: 'branch' = 'branch';

  public readonly next?: Branch | Otherwise;

  constructor(
      public readonly parent: Branch | undefined,
      public readonly condition: Condition,
      public readonly then: (frame: Scope) => any,
      scope?: Scope) {
    super(then, scope);
    if (parent) {
      if (parent.next) {
        throw new Error(`branch already has a child`);
      }
      (parent as any).next = this;
    }
  }

  public $elseIf(condition: Condition, then: (scope: Scope) => any): Branch {
    return this.ElseIf(condition, then);
  }
  public $ElseIf(condition: Condition, then: (scope: Scope) => any): Branch {
    return this.ElseIf(condition, then);
  }
  public ElseIf(condition: Condition, then: (scope: Scope) => any): Branch {
    return If(condition, then, this);
  }

  public $else(then: (scope: Scope) => any): Otherwise {
    return this.Else(then);
  }
  public $Else(then: (scope: Scope) => any): Otherwise {
    return this.Else(then);
  }
  public Else(then: (scope: Scope) => any): Otherwise {
    Thread.get()!.push();
    const terminalBranch = new Otherwise(this, then);
    Thread.get()!.pop();
    return terminalBranch;
  }
}

export class Otherwise {
  constructor(public readonly parent: Branch, public readonly then: (frame: Scope) => any) {
    if (parent.next) {
      throw new Error(`branch already has a child`);
    }
    (parent as any).next = this;
  }
}

export function If(condition: Condition, then: (frame: Scope) => any, parent?: Branch): Branch {
  Thread.get()!.push();
  const branch = new Branch(parent, condition, then);
  Thread.get()!.pop();
  return branch;
}
export const $if = If;
export const $If = If;
export const When = If;
export const $when = When;

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
