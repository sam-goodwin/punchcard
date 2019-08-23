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

export class Size extends Operand<IntegerType> implements ConditionOperand<IntegerType> {
  public readonly [condition]: 'condition' = 'condition';

  constructor(private readonly path: DynamoPath) {
    super(integer());
  }

  public compile(context: CompileContext): string {
    return `size(${this.path.compile(context)})`;
  }

  public eq(value: ConditionValue<IntegerType>): Equals<IntegerType> {
    return new Equals(integer(), this, value);
  }

  public equals(value: ConditionValue<IntegerType>): Equals<IntegerType> {
    return this.eq(value);
  }

  public ne(value: ConditionValue<IntegerType>): NotEquals<IntegerType> {
    return new NotEquals(integer(), this, value);
  }

  public notEquals(value: ConditionValue<IntegerType>): NotEquals<IntegerType> {
    return this.ne(value);
  }

  public gt(value: ConditionValue<IntegerType>): Gt<IntegerType> {
    return new Gt(integer(), this, value);
  }

  public greaterThan(value: ConditionValue<IntegerType>): Gt<IntegerType> {
    return this.gt(value);
  }

  public gte(value: ConditionValue<IntegerType>): Gte<IntegerType> {
    return new Gte(integer(), this, value);
  }

  public greaterThanOrEqual(value: ConditionValue<IntegerType>): Gte<IntegerType> {
    return this.gte(value);
  }

  public lt(value: ConditionValue<IntegerType>): Lt<IntegerType> {
    return new Lt(integer(), this, value);
  }

  public lessThan(value: ConditionValue<IntegerType>): Lt<IntegerType> {
    return this.lt(value);
  }

  public lte(value: ConditionValue<IntegerType>): Lte<IntegerType> {
    return new Lte(integer(), this, value);
  }

  public lessThanOrEqual(value: ConditionValue<IntegerType>): Lte<IntegerType> {
    return this.lte(value);
  }

  public in(...operands: Array<ConditionValue<IntegerType>>): In<IntegerType> {
    return new In(integer(), this, operands);
  }

  public between(lower: ConditionValue<IntegerType>, upper: ConditionValue<IntegerType>) {
    return new Between(integer(), this, lower, upper);
  }
}
