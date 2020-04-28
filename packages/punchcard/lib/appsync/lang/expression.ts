import { $util } from "./util";
import { VObject } from "./vtl-object";

export interface VExpressionContext {
  indentSpaces: number;
}

export interface VExpressionResult {
  text: string;
  context?: VExpressionContext;
}


export type VExpressionLiteral =
  | VExpression
  | string
  | number
  | boolean
  | (null | undefined)
  | VExpressionLiteral[]
  | {
    [key: string]: VExpressionLiteral;
  }
  | VObject
;

const isExpr = Symbol.for('AppSync.isExpr');

export class VExpression {
  public static isExpression(a: any): a is VExpression {
    return a[isExpr] === true;
  }

  public static json<L extends VExpressionLiteral>(obj: L): VExpression {
    if (VExpression.isExpression(obj)) {
      return obj;
    }
    if (VObject.isObject(obj)) {
      return VExpression.call('$util.toJson', obj);
    }

    if (typeof obj === 'string') {
      return VExpression.text(`"${obj}"`);
    } else if (typeof obj === 'number') {
      return VExpression.text(`${obj.toString(10)}`);
    } else if (typeof obj === 'boolean') {
      return VExpression.text(`${obj}`);
    } else if (typeof obj === 'undefined') {
      return VExpression.text('null');
    } else if ((obj as any) instanceof Date) {
      return VExpression.text(`"${(obj as any).toISOString()}"`);
    } else if (Array.isArray(obj)) {
      return VExpression.concat(
        '[',
        VExpression.indent(),
        VExpression.line(),

        ...obj.map((item, i) => VExpression.concat(
          VExpression.json(item),
          i < obj.length - 1 ?
            VExpression.concat(',', VExpression.line()) :
            ''
        )),

        VExpression.unindent(),
        VExpression.line(),
        ']',
      );
    } else if (typeof obj === 'object') {
      const members: [string, VExpressionLiteral][] = Object.entries(obj as any);
      return VExpression.concat(
        '{',
        VExpression.indent(),
        VExpression.line(),

        ...members.map(([name, value], i) => VExpression.concat(
          `"${name}": `,
          VExpression.json(value),
          i < members.length - 1 ?
            VExpression.concat(',', VExpression.line()) :
            ''
        )),
        VExpression.unindent(),
        VExpression.line(),
        '}',
      );
    }

    throw new Error(`could not convert literal type to expression: ${obj}`);
  }

  public static text(text: string) {
    return new VExpression(text);
  }

  public static indent(spaces: number = 2): VExpression {
    return new VExpression(ctx => {
      return {
        text: '',
        context: {
          indentSpaces: ctx.indentSpaces + spaces
        }
      };
    });
  }

  public static block(expr: VExpression) {
    return VExpression.concat(
      VExpression.indent(),
      VExpression.line(),
      expr,
      VExpression.unindent(),
      VExpression.line()
    );
  }

  public static line(): VExpression {
    return new VExpression(ctx => ({
      text: `\n${Array(ctx.indentSpaces).map(_ => ' ').join(' ')}`,
    }));
  }

  public static unindent(spaces: number = 2): VExpression {
    return VExpression.indent(-1 * spaces);
  }

  public readonly [isExpr]: true = true;

  public static call(self: VObject, functionName: string, ...args: (VExpression | VObject | string)[]): VExpression;
  public static call(functionName: string, ...args: (VExpression | VObject | string)[]): VExpression;
  public static call(...args: any[]): VExpression {
    if (typeof args[0] === 'string') {
      const functionName = args[0];
      args = args.slice(1);
      return VExpression.concat(
        functionName, '(',
          VExpression.concat(...args.map((a, i) => i < args.length ? VExpression.concat(a, ',') : a)),
        ')'
      );
    } else {
      const self = args[0];
      const functionName = args[1];
      args = args.slice(2);
      return VExpression.concat(
        self, '.', functionName, '(',
          VExpression.concat(...args.map((a, i) => i < args.length ? VExpression.concat(a, ',') : a)),
        ')'
      );
    }
  }

  public static concat(...expressions: (VExpression | VObject | string)[]) {
    return new VExpression((ctx) => {
      const tokens: string[] = [];
      for (const expr of expressions) {
        if (typeof expr === 'string') {
          tokens.push(expr);
        } else {
          const e = VObject.isObject(expr) ? VObject.getExpression(expr) : expr;
          const result = e.visit(ctx);
          if (result.context !== undefined) {
            ctx = result.context;
          }
          tokens.push(result.text);
        }
      }
      return tokens.join('');
    });
  }

  constructor(private readonly _visit: string | ((ctx: VExpressionContext) => string | VExpressionResult)) {}

  /**
   * Write variables to the Frame and
   * @param frame
   */
  public visit(context: VExpressionContext): VExpressionResult {
    if (typeof this._visit === 'string') {
      return {
        text: this._visit,
        context
      };
    } else {
      const text = this._visit(context);
      return typeof text === 'string' ? {
        text,
        context
      } : text;
    }
  }
}
