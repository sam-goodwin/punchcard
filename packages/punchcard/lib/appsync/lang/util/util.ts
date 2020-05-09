import { Shape } from '@punchcard/shape';
import { VExpression } from '../expression';
import { stash } from '../statement';
import { VTL } from '../vtl';
import { VBool, VNever, VObject, VString } from '../vtl-object';
import { $DynamoDBUtil as DynamoDBUtil } from './dynamodb';
import { $ListUtil as ListUtil } from './list';
import { TimeUtil } from './time';

// tslint:disable: unified-signatures

export class Util {
  public validate(condition: VBool, message: VString | string, errorType?: VString | string): VTL<VNever> {
    throw new Error('todo');
  }

  public *autoId(): VTL<VString> {
    // return yield new Statements.Set(value, id);
    return yield* stash(new VString(VExpression.text('$util.autoId()')));
  }

  public matches(regex: RegExp | string): VTL<VBool> {
    throw new Error('todo');
  }

  public unauthorized(): VNever {
    return new VNever(VExpression.text('$util.unauthorized()'));
  }

  /**
   * Returns a String describing the type of the Object. Supported type identifications
   * are: `Null`, `Number`, `String`, `Map`, `List`, `Boolean`. If a type cannot be
   * identified, the return type is `Object`.
   */
  public typeOf<T extends VObject<Shape>>(obj: T): VString {
    return new VString(VExpression.concat(
      '$util.typeOf(', obj, ')'
    ));
  }

  public error(message: VString | string, errorType: VString | string, data: VObject, errorInfo: VObject): VNever;
  public error(message: VString | string, errorType: VString | string, data: VObject): VNever;
  public error(message: VString | string, errorType: VString | string): VNever;
  public error(message: VString | string): VNever;

  /**
   * @param message
   * @see https://docs.aws.amazon.com/appsync/latest/devguide/resolver-util-reference.html
   */
  public error(message: VString | string, errorType?: VString | string, data?: VObject, errorInfo?: VObject): VNever {
    return new VNever(call('$util.error', [message, errorType, data, errorInfo]));
  }

  public isNull(value: VObject): VBool {
    return new VBool(new VExpression(state => state.write('$util.isNull(', value, ')')));
  }

  public isNotNull(value: VObject): VBool {
    return new VBool(new VExpression(state => state.write(`!$util.isNull(`, value, `)`)));
  }

  public *defaultIfNull<T extends VObject>(obj: T, defaultValue: VObject.Like<VObject.TypeOf<T>>): VTL<T> {
    const type = VObject.getType(obj);
    const defaultV = yield* VObject.of(type, defaultValue);
    return VObject.fromExpr(type, new VExpression(state => state.write(
      '$util.defaultIfNull(', obj, ',', defaultV, ')'
    ))) as any;
  }

  public readonly dynamodb = new DynamoDBUtil();
  public readonly list = new ListUtil();
  public readonly time = new TimeUtil();
}

function call(functionName: string, args: (string | VObject | undefined)[]) {
  return new VExpression(state => {
    const parameters = [];
    for (const arg of args) {
      if (arg === undefined) {
        // we do this weird loop so we stop when we hit the first undefined parameter
        // that's so we can support overloaded methods like `$util.error`.
        break;
      }
      parameters.push(arg);
    }

    state.write(functionName, '(', ...parameters, ')');
  });
}

/**
 * https://docs.aws.amazon.com/appsync/latest/devguide/resolver-util-reference.html
 */
export const $util = new Util();
