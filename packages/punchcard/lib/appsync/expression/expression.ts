import { Shape, ShapeGuards } from '@punchcard/shape';
import { Frame } from '../intepreter/frame';

export class Expression {
  private readonly text: (ctx: Frame) => void;

  constructor(text: string | ((ctx: Frame) => void)) {
    if (typeof text === 'string') {
      this.text = (ctx) => ctx.print(text);
    } else {
      this.text = text;
    }
  }

  /**
   * Write the Expression to VTL.
   */
  public visit(ctx: Frame): void {
    this.text(ctx);
  }

  public dot(text: string): Expression {
    return new Expression((ctx) => {
      this.visit(ctx);
      ctx.print('.');
      ctx.print(text);
    });
  }

  public prepend(text: string): Expression {
    return new Expression((ctx) => {
      ctx.print(text);
      this.visit(ctx);
    });
  }

  public surround(left: string, right: string = ''): Expression {
    return new Expression((ctx) => {
      ctx.print(left);
      this.visit(ctx);
      ctx.print(right);
    });
  }
}

/**
 * Volatile expressions can not be indexed - they must be stored as a variable before being referenced.
 */
export class VolatileExpression<T extends Shape = Shape> extends Expression {
  constructor(public readonly type: T, text: string | ((ctx: Frame) => void)) {
    super(text);
  }

  public visit(frame: Frame): void {
    let name = frame.lookup(this);

    if (!name) {
      name = frame.register(this);
      const vars = frame.variables;

      name = vars.getNewId();
      vars.print(`#set($${name} = `);
      vars.print(`'`);
      if (ShapeGuards.isStringShape(this.type)) {
        // strings are enclosed in '' to escape their content.
        vars.print(`'`);
      }
      super.visit(vars);
      if (ShapeGuards.isStringShape(this.type)) {
        vars.print(`'`);
      }
      vars.printLine(`')`);
    }
    frame.print(`$${name}`);
  }
}