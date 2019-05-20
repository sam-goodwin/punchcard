import { integer, IntegerType } from "../../../shape/types/number";
import { CompileContext } from "./compile-context";
import { DynamoPath } from "./path";
import { Between, condition, ConditionOperand, ConditionValue, Equals, Gt, Gte, In, Lt, Lte, NotEquals, Operand } from "./path";

/**
 * Size function
 */
export function size(path: DynamoPath): Size {
  return new Size(path);
}

export class Size extends Operand<IntegerType, number> implements ConditionOperand<IntegerType, number> {
  public readonly [condition]: 'condition' = 'condition';

  constructor(private readonly path: DynamoPath) {
    super(integer());
  }

  public compile(context: CompileContext): string {
    return `size(${this.path.compile(context)})`;
  }

  public eq(value: ConditionValue<IntegerType, number>): Equals<IntegerType, number> {
    return new Equals(integer(), this, value);
  }

  public equals(value: ConditionValue<IntegerType, number>): Equals<IntegerType, number> {
    return this.eq(value);
  }

  public ne(value: ConditionValue<IntegerType, number>): NotEquals<IntegerType, number> {
    return new NotEquals(integer(), this, value);
  }

  public notEquals(value: ConditionValue<IntegerType, number>): NotEquals<IntegerType, number> {
    return this.ne(value);
  }

  public gt(value: ConditionValue<IntegerType, number>): Gt<IntegerType, number> {
    return new Gt(integer(), this, value);
  }

  public greaterThan(value: ConditionValue<IntegerType, number>): Gt<IntegerType, number> {
    return this.gt(value);
  }

  public gte(value: ConditionValue<IntegerType, number>): Gte<IntegerType, number> {
    return new Gte(integer(), this, value);
  }

  public greaterThanOrEqual(value: ConditionValue<IntegerType, number>): Gte<IntegerType, number> {
    return this.gte(value);
  }

  public lt(value: ConditionValue<IntegerType, number>): Lt<IntegerType, number> {
    return new Lt(integer(), this, value);
  }

  public lessThan(value: ConditionValue<IntegerType, number>): Lt<IntegerType, number> {
    return this.lt(value);
  }

  public lte(value: ConditionValue<IntegerType, number>): Lte<IntegerType, number> {
    return new Lte(integer(), this, value);
  }

  public lessThanOrEqual(value: ConditionValue<IntegerType, number>): Lte<IntegerType, number> {
    return this.lte(value);
  }

  public in(...operands: Array<ConditionValue<IntegerType, number>>): In<IntegerType, number> {
    return new In(integer(), this, operands);
  }

  public between(lower: ConditionValue<IntegerType, number>, upper: ConditionValue<IntegerType, number>) {
    return new Between(integer(), this, lower, upper);
  }
}
