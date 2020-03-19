import { GraphQL } from '../graphql';

export function $if<T extends GraphQL.Type>(condition: GraphQL.Bool, then: () => T): If<T> {
  return new If(undefined, condition, then);
}

export const $elseIf = $if;

export class If<T extends GraphQL.Type> {
  constructor(
    public readonly parent: If<T> | undefined,
    public readonly condition: GraphQL.Bool,
    public readonly then: () => T
  ) {}

  public $elseIf(condition: GraphQL.Bool, then: () => T): If<T> {
    return new If(this, condition, then);
  }

  public $else(then: () => T): T {
    const t = this.then();
    return GraphQL.clone(t, new GraphQL.Expression(frame => {
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
