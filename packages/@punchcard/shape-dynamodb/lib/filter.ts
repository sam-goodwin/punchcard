import AWS = require('aws-sdk');
import { DSL } from './dsl';
import { Writer } from './writer';

export namespace Filter {
  export interface Expression extends Pick<AWS.DynamoDB.QueryInput, 'FilterExpression' | 'ExpressionAttributeValues' | 'ExpressionAttributeNames'> {}

  export function compile(expression: DSL.Bool): Filter.Expression {
    const writer = new Writer();
    expression.synthesize(writer);
    const expr = writer.toExpression();
    return {
      FilterExpression: expr.Expression,
      ExpressionAttributeNames: expr.ExpressionAttributeNames,
      ExpressionAttributeValues: expr.ExpressionAttributeValues
    };
  }
}