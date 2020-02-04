import AWS = require('aws-sdk');
import { DSL } from './dsl';
import { Writer } from './writer';

export namespace Update {
  export interface Expression extends Pick<AWS.DynamoDB.UpdateItemInput, 'UpdateExpression' | 'ExpressionAttributeNames' | 'ExpressionAttributeValues'> {}

  export function compile(statements: DSL.StatementNode[]): Update.Expression {
    const writer = new Writer();
    for (let i = 0; i < statements.length; i++) {
      statements[i][DSL.Synthesize](writer);
      if (i + 1 < statements.length) {
        writer.writeToken(' ');
      }
    }
    const expr = writer.toExpression();
    const res = {
      UpdateExpression: expr.Expression,
      ExpressionAttributeNames: expr.ExpressionAttributeNames,
      ExpressionAttributeValues: expr.ExpressionAttributeValues,
    };
    if (!res.ExpressionAttributeNames) {
      delete res.ExpressionAttributeNames;
    }
    if (!res.ExpressionAttributeValues) {
      delete res.ExpressionAttributeValues;
    }
    return res;
  }
}