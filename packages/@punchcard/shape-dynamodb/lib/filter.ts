import AWS = require('aws-sdk');
import { DSL } from './dsl';
import { Writer } from './writer';

export namespace Condition {
  export interface Expression {
    Expression: string;
    ExpressionAttributeNames: { [name: string]: string };
    ExpressionAttributeValues: { [id: string]: AWS.DynamoDB.AttributeValue; }
  }

  export function compile(expression: DSL.Bool, writer: Writer = new Writer()): Condition.Expression {
    write(expression, writer);
    const expr = writer.toExpression();
    const res: any = {
      Expression: expr.Expression,
      ExpressionAttributeNames: expr.ExpressionAttributeNames,
      ExpressionAttributeValues: expr.ExpressionAttributeValues
    };
    if (!res.ExpressionAttributeNames) {
      delete res.ExpressionAttributeNames;
    }
    if (!res.ExpressionAttributeValues) {
      delete res.ExpressionAttributeValues;
    }
    return res;
  }

  export function write(expression: DSL.ExpressionNode<any> | DSL.StatementNode, writer?: Writer): Writer {
    writer = writer || new Writer();
    expression[DSL.Synthesize](writer);
    return writer;
  }
}