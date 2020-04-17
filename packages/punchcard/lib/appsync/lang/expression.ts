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
;

const isExpr = Symbol.for('AppSync.isExpr');

export class VExpression {
  public static isExpression(a: any): a is VExpression {
    return a[isExpr] === true;
  }

  public static json<L extends VExpressionLiteral>(literal: L): VExpression {
    if (VExpression.isExpression(literal)) {
      return literal;
    }

    if (typeof literal === 'string') {
      return VExpression.text(`"${literal}"`);
    } else if (typeof literal === 'number') {
      return VExpression.text(`${literal.toString(10)}`);
    } else if (typeof literal === 'boolean') {
      return VExpression.text(`${literal}`);
    } else if (typeof literal === 'undefined') {
      return VExpression.text('null');
    } else if ((literal as any) instanceof Date) {
      return VExpression.text(`"${(literal as any).toISOString()}"`);
    } else if (Array.isArray(literal)) {
      return VExpression.concat(
        '[',
        VExpression.indent(),
        VExpression.line(),

        ...literal.map((item, i) => VExpression.concat(
          VExpression.json(item),
          i < literal.length - 1 ?
            VExpression.concat(',', VExpression.line()) :
            ''
        )),

        VExpression.unindent(),
        VExpression.line(),
        ']',
      );
    } else if (typeof literal === 'object') {
      const members: [string, VExpressionLiteral][] = Object.entries(literal as any);
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

    throw new Error(`could not convert literal type to expression: ${literal}`);
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

  public static concat(...expressions: (VExpression | VObject | string)[]) {
    return new VExpression((ctx) => {
      const tokens: string[] = [];
      for (const expr of expressions) {
        if (typeof expr === 'string') {
          tokens.push(expr);
        } else {
          const e = VObject.isObject(expr) ? VObject.exprOf(expr) : expr;
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
