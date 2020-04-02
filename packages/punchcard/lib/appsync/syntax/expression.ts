import { Shape } from '@punchcard/shape';
import { Frame } from '../intepreter/frame';

export class VExpression {
  public static text(text: string) {
    return new VExpression(text);
  }

  public static concat(...expressions: VExpression[]) {
    return new VExpression(() => expressions.map(e => e.visit()).join(''));
  }

  constructor(private readonly print: string | (() => string)) {}

  /**
   * Write variables to the Frame and
   * @param frame
   */
  public visit(): string {
    if (typeof this.print === 'string') {
      return this.print;
    } else {
      return this.print();
    }
  }

  public dot(text: string): VExpression {
    return new VExpression(() => `${this.visit()}.${text}`);
  }

  public prepend(text: string): VExpression {
    return new VExpression(() => `${text}${this.visit()}`);
  }

  public surround(left: string, right: string = ''): VExpression {
    return new VExpression(() => `${left}${this.visit()}${right}`);
  }
}
