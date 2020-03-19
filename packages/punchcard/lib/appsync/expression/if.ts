import { GraphQL } from "../types";

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
    return GraphQL.clone(t, new GraphQL.Expression(ctx => {
      ctx.print('#if(');
      this.chain().forEach((c, i) => {
        GraphQL.render(c.condition, ctx);
        ctx.print(')');
        ctx.print('#elseif(');
      });
      ctx.print('#{else}');
      GraphQL.render(t, ctx);
      ctx.print('#end');
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
