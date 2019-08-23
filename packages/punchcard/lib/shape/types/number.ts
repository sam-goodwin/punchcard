import { DynamoPath, Minus, OrdPath, Plus, SetAction, UpdateValue } from '../../storage/dynamodb/expression/path';
import { Kind } from './kind';
import { PrimitiveType } from './primitive';
import { Type } from './type';

export interface NumberConstraints {
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
  multipleOf?: number;
}

abstract class BaseNumberType extends PrimitiveType<number> {
  public readonly constraints?: NumberConstraints;

  constructor(kind: Kind, constraints: NumberConstraints, private readonly jsonType: string, private readonly glueType: string) {
    super(kind);
    if (Object.keys(constraints).length > 0) {
      this.constraints = constraints;
    }
  }

  public toDynamoPath(parent: DynamoPath, name: string): NumericDynamoPath<this, number> {
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

  public isInstance(a: any): a is number {
    if (typeof a !== 'number') {
      return false;
    }
    try {
      // TODO: ugly, return something better from validate.
      this.validate(a);
      return true;
    } catch (err) {
      return false;
    }
  }

  public hashCode(value: number): number {
    return value;
  }
}

class WholeNumberType extends BaseNumberType {
  public validate(value: number): void {
    super.validate(value);
    if (value % 1 !== 0) {
      throw new Error('integer must be a whole number');
    }
  }

}

export class BigIntType extends WholeNumberType {
  constructor(constraints: NumberConstraints = {}) {
    super(Kind.Number, constraints, 'integer', 'bigint');
  }
}

export class DoubleType extends BaseNumberType {
  constructor(constraints: NumberConstraints = {}) {
    super(Kind.Number, constraints, 'number', 'double');
  }
}

export class FloatType extends BaseNumberType {
  constructor(constraints: NumberConstraints = {}) {
    super(Kind.Number, constraints, 'number', 'float');
  }
}

export class IntegerType extends WholeNumberType {
  constructor(constraints: NumberConstraints = {}) {
    super(Kind.Integer, constraints, 'integer', 'int');
  }
}

export class SmallIntType extends WholeNumberType {
  constructor(constraints: NumberConstraints = {}) {
    super(Kind.Number, constraints, 'integer', 'smallint');
  }
}

export class TinyIntType extends WholeNumberType {
  constructor(constraints: NumberConstraints = {}) {
    super(Kind.Number, constraints, 'integer', 'tinyint');
  }
}

const defaultInteger = new IntegerType();
const defaultBigInt = new BigIntType();
const defaultFloat = new FloatType();
const defaultDouble = new DoubleType();
const defaultSmallInt = new SmallIntType();
const defaultTinyInt = new TinyIntType();

export function bigint(constraints?: NumberConstraints) {
  if (constraints) {
    return new BigIntType(constraints);
  } else {
    return defaultBigInt;
  }
}
export function double(constraints?: NumberConstraints) {
  if (constraints) {
    return new DoubleType(constraints);
  } else {
    return defaultDouble;
  }
}
export function float(constraints?: NumberConstraints) {
  if (constraints) {
    return new FloatType(constraints);
  } else {
    return defaultFloat;
  }
}
export function integer(constraints?: NumberConstraints) {
  if (constraints) {
    return new IntegerType(constraints);
  } else {
    return defaultInteger;
  }
}
export function smallint(constraints?: NumberConstraints) {
  if (constraints) {
    return new SmallIntType(constraints);
  } else {
    return defaultSmallInt;
  }
}
export function tinyint(constraints?: NumberConstraints) {
  if (constraints) {
    return new TinyIntType(constraints);
  } else {
    return defaultTinyInt;
  }
}

export class NumericDynamoPath<T extends Type<V>, V> extends OrdPath<T, V> {
  public plus(value: UpdateValue<T, V>): Plus<T, V> {
    return new Plus(this.type, this, value);
  }

  public minus(value: UpdateValue<T, V>): Minus<T, V> {
    return new Minus(this.type, this, value);
  }

  public increment(value: UpdateValue<T, V>): SetAction<T, V> {
    return new SetAction<T, V>(this, this.plus(value));
  }

  public decrement(value: UpdateValue<T, V>): SetAction<T, V> {
    return new SetAction<T, V>(this, this.minus(value));
  }
}
