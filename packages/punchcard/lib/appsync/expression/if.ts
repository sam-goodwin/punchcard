import { VBool } from '../types';
import { VObject } from '../types/object';
import { Expression } from './expression';

export function $if<T extends VObject>(condition: VBool, then: () => T): If<T> {
  return new If(undefined, condition, then);
}

export const $elseIf = $if;

export class If<T extends VObject> {
  constructor(
    public readonly parent: If<T> | undefined,
    public readonly condition: VBool,
    public readonly then: () => T
  ) {}

  public $elseIf(condition: VBool, then: () => T): If<T> {
    return new If(this, condition, then);
  }

  public $else(then: () => T): T {
    const t = this.then();
    return VObject.clone(t, new Expression(frame => {
      frame.print('#if(');
      const chain = this.chain();
      chain.forEach((c, i) => {
        frame.interpret(c.condition);
        frame.print(')');
        frame.indent();
        frame.printLine();
        // interpret the block
        frame.interpret(c.then());
        frame.unindent();
        frame.printLine();
        if (i < chain.length - 1) {
          frame.print('#elseif(');
        }
      });
      frame.print('#{else}');
      frame.indent();
      frame.printLine();

      frame.interpret(then());

      frame.unindent();
      frame.printLine();
      frame.print('#end');
    }));
  }

  private chain(): If<any>[] {
    const chain: If<any>[] = [this];
    let p = this.parent;
    while (p !== undefined) {
      chain.push(p);
      p = p.parent;
    }
    return chain.reverse();
  }
}
