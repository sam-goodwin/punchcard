import { Shape } from '@punchcard/shape';
import { Frame } from '../intepreter/frame';

export class VExpression {
  public static text(text: string) {
    return new VExpression(text);
  }

  public static concat(...expressions: VExpression[]) {
    return new VExpression(frame => expressions.map(e => e.visit(frame)).join(''));
  }

  constructor(private readonly print: string | ((frame: Frame) => void)) {}

  /**
   * Write variables to the Frame and
   * @param frame
   */
  public visit(frame: Frame): string | void {
    if (typeof this.print === 'string') {
      return frame.print(this.print);
    } else {
      return this.print(frame);
    }
  }

  public dot(text: string): VExpression {
    return new VExpression((frame) => {
      this.visit(frame);
      frame.print(`.${text}`);
    });
  }

  public prepend(text: string): VExpression {
    return new VExpression((frame) => {
      frame.print(text);
      this.visit(frame);
    });
  }

  public surround(left: string, right: string = ''): VExpression {
    return new VExpression((frame) => {
      frame.print(left);
      this.visit(frame);
      frame.print(right);
    });
  }
}

/**
 * Volatile expressions can not be indexed - they must be stored as a variable before being referenced.
 */
export class VolatileExpression<T extends Shape = Shape> extends VExpression {
  constructor(public readonly type: T, text: string | ((ctx: Frame) => string)) {
    super(text);
  }

  public visit(frame: Frame): void {
    let name = frame.lookup(this);

    if (!name) {
      name = frame.register(this);
      // name = frame.getNewId();

      frame.print(`#set($${name} = `);
      super.visit(frame);
      frame.print(')');
    }
    frame.print(`$${name}`);
  }
}
