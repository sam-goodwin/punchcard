import { bool, string } from '@punchcard/shape';
import { Expression } from '../intepreter/expression';
import { StatementF } from '../intepreter/statement';
import { VBool } from '../types/bool';
import { VNothing } from '../types/nothing';
import { expr, VObject } from '../types/object';
import { VString } from '../types/string';
import { $DynamoDBUtil as DynamoDBUtil } from './dynamodb';
import { $ListUtil as ListUtil } from './list';

export class Util {
  public validate(condition: VBool, message: VString | string, errorType?: VString | string): StatementF<VNothing> {
    return null as any;
  }

  public autoId(): VString {
    return new VString(string, new Expression('$util.autoId()'));
  }

  public matches(regex: RegExp | string): StatementF<VBool> {
    throw new Error('todo');
  }

  public isNull(value: VObject): VBool {
    return new VBool(bool, new Expression((frame) => {
      frame.print(`$util.isNull(`);
      value[expr].visit(frame);
      frame.print(')');
    }));
  }

  public readonly dynamodb = new DynamoDBUtil();
  public readonly list = new ListUtil();
}

/**
 * https://docs.aws.amazon.com/appsync/latest/devguide/resolver-util-reference.html
 */
export const $util = new Util();
