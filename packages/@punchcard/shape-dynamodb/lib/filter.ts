import AWS = require('aws-sdk');
import { DSL } from './dsl';
import { Writer } from './writer';

export namespace Condition {
  export interface Expression {
    Expression: string;
    ExpressionAttributeNames: { [name: string]: string };
    ExpressionAttributeValues: { [id: string]: AWS.DynamoDB.AttributeValue; }
  }

  export function compile(expression: DSL.Bool): Condition.Expression {
    const writer = new Writer();
    write(expression, writer);
    const expr = writer.toExpression();
    return {
      Expression: expr.Expression,
      ExpressionAttributeNames: expr.ExpressionAttributeNames,
      ExpressionAttributeValues: expr.ExpressionAttributeValues
    };
  }

  export function write(expression: DSL.ExpressionNode<any> | DSL.StatementNode, writer?: Writer): Writer {
    writer = writer || new Writer();
    expression[DSL.Synthesize](writer);
    return writer;
  }
}