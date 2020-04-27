import { Shape } from "@punchcard/shape";
import { VObject } from "../../appsync";
import { DynamoExpr } from "./dynamo-expr";
import { UpdateTransaction } from "./update-transaction";

export function isAddExpressionName(a: any): a is AddExpressionName {
  return a.tag === AddExpressionName.TAG;
}
export function *addExpressionName(expr: DynamoExpr<Shape>): UpdateTransaction<string> {
  return (yield new AddExpressionName(expr)) as any;
}
export class AddExpressionName {
  public static readonly TAG = 'add-expression-name';
  public readonly tag = AddExpressionName.TAG;
  constructor(
    public readonly expr: DynamoExpr<Shape>
  ) {}
}

export function isAddExpressionValue(a: any): a is AddExpressionValue<Shape> {
  return a.tag === AddExpressionValue.TAG;
}
export function *addExpressionValue<T extends Shape>(type: T, value: VObject.Like<T>): UpdateTransaction<string> {
  return (yield new AddExpressionValue(type, value)) as any;
}
export class AddExpressionValue<T extends Shape> {
  public static readonly TAG = 'add-expression-value';
  public readonly tag = AddExpressionValue.TAG;
  constructor(
    public readonly type: T,
    public readonly value: VObject.Like<T>
  ) {}
}
