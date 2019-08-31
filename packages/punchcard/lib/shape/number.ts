import { DynamoPath, Minus, OrdPath, Plus, SetAction, UpdateValue } from '../dynamodb/expression/path';
import { Kind } from './kind';
import { PrimitiveShape } from './primitive';
import { Type } from './type';

export interface NumberConstraints {
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  multipleOf?: number;
}

abstract class BaseNumberShape extends PrimitiveShape<number> {
  public readonly constraints?: NumberConstraints;

  constructor(kind: Kind, constraints: NumberConstraints, private readonly jsonType: string, private readonly glueType: string) {
    super(kind);
    if (Object.keys(constraints).length > 0) {
      this.constraints = constraints;
    }
  }

  public toDynamoPath(parent: DynamoPath, name: string): NumericDynamoPath<this> {
    return new NumericDynamoPath(parent, name, this);
  }

  public toJsonSchema(): { [key: string]: any; } {
    return { type: this.jsonType, ...this.constraints };
  }

  public toGlueType() {
    return {
      inputString: this.glueType,
      isPrimitive: true
    };
  }

  public validate(value: number): void {
    if (!this.constraints) {
      return;
    }
    if (this.constraints.minimum !== undefined) {
      if (this.constraints.exclusiveMinimum && value <= this.constraints.minimum) {
        throw new Error(`number must be > ${this.constraints.minimum}`);
      } else if (value < this.constraints.minimum) {
        throw new Error(`number must be >= ${this.constraints.minimum}`);
      }
    }
    if (this.constraints.maximum !== undefined) {
      if (this.constraints.exclusiveMaximum && value >= this.constraints.maximum) {
        throw new Error(`number must be < ${this.constraints.maximum}`);
      } else if (value > this.constraints.maximum) {
        throw new Error(`number must be <= ${this.constraints.maximum}`);
      }
    }
    if (this.constraints.multipleOf !== undefined && value % this.constraints.multipleOf !== 0) {
      throw new Error(`number must be a multiple of ${this.constraints.multipleOf}`);
    }
  }

  public hashCode(value: number): number {
    return value;
  }
}

class WholeNumberShape extends BaseNumberShape {
  public validate(value: number): void {
    super.validate(value);
    if (value % 1 !== 0) {
      throw new Error('integer must be a whole number');
    }
  }

}

export class BigIntShape extends WholeNumberShape {
  constructor(constraints: NumberConstraints = {}) {
    super(Kind.Number, constraints, 'integer', 'bigint');
  }
}

export class DoubleShape extends BaseNumberShape {
  constructor(constraints: NumberConstraints = {}) {
    super(Kind.Number, constraints, 'number', 'double');
  }
}

export class FloatShape extends BaseNumberShape {
  constructor(constraints: NumberConstraints = {}) {
    super(Kind.Number, constraints, 'number', 'float');
  }
}

export class IntegerShape extends WholeNumberShape {
  constructor(constraints: NumberConstraints = {}) {
    super(Kind.Integer, constraints, 'integer', 'int');
  }
}

export class SmallIntShape extends WholeNumberShape {
  constructor(constraints: NumberConstraints = {}) {
    super(Kind.Number, constraints, 'integer', 'smallint');
  }
}

export class TinyIntShape extends WholeNumberShape {
  constructor(constraints: NumberConstraints = {}) {
    super(Kind.Number, constraints, 'integer', 'tinyint');
  }
}

const defaultInteger = new IntegerShape();
const defaultBigInt = new BigIntShape();
const defaultFloat = new FloatShape();
const defaultDouble = new DoubleShape();
const defaultSmallInt = new SmallIntShape();
const defaultTinyInt = new TinyIntShape();

export function bigint(constraints?: NumberConstraints) {
  if (constraints) {
    return new BigIntShape(constraints);
  } else {
    return defaultBigInt;
  }
}
export function double(constraints?: NumberConstraints) {
  if (constraints) {
    return new DoubleShape(constraints);
  } else {
    return defaultDouble;
  }
}
export function float(constraints?: NumberConstraints) {
  if (constraints) {
    return new FloatShape(constraints);
  } else {
    return defaultFloat;
  }
}
export function integer(constraints?: NumberConstraints) {
  if (constraints) {
    return new IntegerShape(constraints);
  } else {
    return defaultInteger;
  }
}
export function smallint(constraints?: NumberConstraints) {
  if (constraints) {
    return new SmallIntShape(constraints);
  } else {
    return defaultSmallInt;
  }
}
export function tinyint(constraints?: NumberConstraints) {
  if (constraints) {
    return new TinyIntShape(constraints);
  } else {
    return defaultTinyInt;
  }
}

export class NumericDynamoPath<T extends Type<any>> extends OrdPath<T> {
  public plus(value: UpdateValue<T>): Plus<T> {
    return new Plus(this.type, this, value);
  }

  public minus(value: UpdateValue<T>): Minus<T> {
    return new Minus(this.type, this, value);
  }

  public increment(value: UpdateValue<T>): SetAction<T> {
    return new SetAction<T>(this, this.plus(value));
  }

  public decrement(value: UpdateValue<T>): SetAction<T> {
    return new SetAction<T>(this, this.minus(value));
  }
}
