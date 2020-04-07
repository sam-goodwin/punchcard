import { bool, never, string } from '@punchcard/shape';
import { VExpression } from '../expression';
import { set } from '../statement';
import { VTL } from '../vtl';
import { VBool, VNever, VObject, VString } from '../vtl-object';
import { $DynamoDBUtil as DynamoDBUtil } from './dynamodb';
import { $ListUtil as ListUtil } from './list';
import { TimeUtil } from './time';

export class Util {
  public validate(condition: VBool, message: VString | string, errorType?: VString | string): VTL<VNever> {
    throw new Error('todo');
  }

  public *autoId(): VTL<VString> {
    // return yield new Statements.Set(value, id);
    return yield* set(new VString(string, new VExpression('$util.autoId()')));
  }

  public matches(regex: RegExp | string): VTL<VBool> {
    throw new Error('todo');
  }

  public *error(message: VString): VTL<VNever> {
    return yield* set(new VNever(never, new VExpression((ctx) => `$util.error(${VObject.exprOf(message).visit(ctx)})`)));
  }

  public isNull(value: VObject): VBool {
    return new VBool(bool, new VExpression((ctx) => `$util.isNull(${VObject.exprOf(value).visit(ctx)})`));
  }

  public readonly dynamodb = new DynamoDBUtil();
  public readonly list = new ListUtil();
  public readonly time = new TimeUtil();
}

/**
 * https://docs.aws.amazon.com/appsync/latest/devguide/resolver-util-reference.html
 */
export const $util = new Util();
