import { integer, IntegerShape } from "../../shape/number";
import { CompileContext } from "./compile-context";
import { DynamoPath } from "./path";
import { Between, condition, ConditionOperand, ConditionValue, Equals, Gt, Gte, In, Lt, Lte, NotEquals, Operand } from "./path";

/**
 * Size function
 */
export function size(path: DynamoPath): Size {
  return new Size(path);
}

export class Size extends Operand<IntegerShape> implements ConditionOperand<IntegerShape> {
  public readonly [condition]: 'condition' = 'condition';

  constructor(private readonly path: DynamoPath) {
    super(integer());
  }

  public compile(context: CompileContext): string {
    return `size(${this.path.compile(context)})`;
  }

  public eq(value: ConditionValue<IntegerShape>): Equals<IntegerShape> {
    return new Equals(integer(), this, value);
  }

  public equals(value: ConditionValue<IntegerShape>): Equals<IntegerShape> {
    return this.eq(value);
  }

  public ne(value: ConditionValue<IntegerShape>): NotEquals<IntegerShape> {
    return new NotEquals(integer(), this, value);
  }

  public notEquals(value: ConditionValue<IntegerShape>): NotEquals<IntegerShape> {
    return this.ne(value);
  }

  public gt(value: ConditionValue<IntegerShape>): Gt<IntegerShape> {
    return new Gt(integer(), this, value);
  }

  public greaterThan(value: ConditionValue<IntegerShape>): Gt<IntegerShape> {
    return this.gt(value);
  }

  public gte(value: ConditionValue<IntegerShape>): Gte<IntegerShape> {
    return new Gte(integer(), this, value);
  }

  public greaterThanOrEqual(value: ConditionValue<IntegerShape>): Gte<IntegerShape> {
    return this.gte(value);
  }

  public lt(value: ConditionValue<IntegerShape>): Lt<IntegerShape> {
    return new Lt(integer(), this, value);
  }

  public lessThan(value: ConditionValue<IntegerShape>): Lt<IntegerShape> {
    return this.lt(value);
  }

  public lte(value: ConditionValue<IntegerShape>): Lte<IntegerShape> {
    return new Lte(integer(), this, value);
  }

  public lessThanOrEqual(value: ConditionValue<IntegerShape>): Lte<IntegerShape> {
    return this.lte(value);
  }

  public in(...operands: Array<ConditionValue<IntegerShape>>): In<IntegerShape> {
    return new In(integer(), this, operands);
  }

  public between(lower: ConditionValue<IntegerShape>, upper: ConditionValue<IntegerShape>) {
    return new Between(integer(), this, lower, upper);
  }
}
