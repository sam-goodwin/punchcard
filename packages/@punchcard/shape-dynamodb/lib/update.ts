import AWS = require('aws-sdk');
import { DSL } from './dsl';
import { Writer } from './writer';

export namespace Update {
  export interface Expression extends Pick<AWS.DynamoDB.UpdateItemInput, 'UpdateExpression' | 'ExpressionAttributeNames' | 'ExpressionAttributeValues'> {}

  export function compile(statements: DSL.StatementNode[]): Update.Expression {
    const writer = new Writer();
    for (const statement of statements) {
      statement.synthesize(writer);
    }
    const expr = writer.toExpression();
    return {
      UpdateExpression: expr.Expression,
      ExpressionAttributeNames: expr.ExpressionAttributeNames,
      ExpressionAttributeValues: expr.ExpressionAttributeValues,
    };
  }
}