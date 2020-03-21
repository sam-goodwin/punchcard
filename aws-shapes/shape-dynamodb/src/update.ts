import AWS = require('aws-sdk');
import { DSL } from './dsl';
import { Writer } from './writer';

export namespace Update {
  export interface Expression extends Pick<AWS.DynamoDB.UpdateItemInput, 'UpdateExpression' | 'ExpressionAttributeNames' | 'ExpressionAttributeValues'> {}

  export function compile(actions: DSL.Action[], writer: Writer = new Writer()): Update.Expression {
    function write(actionType: DSL.ActionType) {
      const a = actions.filter(a => a.actionType === actionType);
      if (a) {
        writer.writeToken(actionType + ' ');
        a.forEach((action, i) => {
          action.statement[DSL.Synthesize](writer);
          if (i + 1 < a.length) {
            writer.writeToken(', ');
          }
        });
      }
    }

    write(DSL.ActionType.SET);

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