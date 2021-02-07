import { any, map, string, Type } from "@punchcard/shape";

export class ConditionExpression extends Type({
  expression: string,
  expressionNames: map(string),
  expressionValues: map(any)
}) {}