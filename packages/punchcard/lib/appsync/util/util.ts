import { bool, string } from '@punchcard/shape';
import { VExpression, VolatileExpression } from '../syntax/expression';
import { StatementF } from '../syntax/statement';
import { VTL } from '../types';
import { VBool } from '../types/bool';
import { VNever } from '../types/never';
import { VNothing } from '../types/nothing';
import { expr, VObject } from '../types/object';
import { VString } from '../types/string';
import { $DynamoDBUtil as DynamoDBUtil } from './dynamodb';
import { $ListUtil as ListUtil } from './list';
import { TimeUtil } from './time';

export class Util {
  public validate(condition: VBool, message: VString | string, errorType?: VString | string): VTL<VNever> {
    
  }
  public validateF(condition: VBool, message: VString | string, errorType?: VString | string): StatementF<VNothing> {
    return null as any;
  }

  public autoId(): VTL<VString> {
    return new VString(string, new VolatileExpression(string, '$util.autoId()'));
  }

  public matches(regex: RegExp | string): StatementF<VBool> {
    throw new Error('todo');
  }

  public error(message: VString): VTL<VNever> {

  }

  public isNull(value: VObject): VBool {
    return new VBool(bool, new VExpression((frame) => {
      frame.print(`$util.isNull(`);
      value[expr].visit(frame);
      frame.print(')');
    }));
  }

  public readonly dynamodb = new DynamoDBUtil();
  public readonly list = new ListUtil();
  public readonly time = new TimeUtil();
}

/**
 * https://docs.aws.amazon.com/appsync/latest/devguide/resolver-util-reference.html
 */
export const $util = new Util();
