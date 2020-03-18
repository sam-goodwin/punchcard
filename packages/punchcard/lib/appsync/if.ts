import { GraphQL } from "./types";

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
    return GraphQL.clone(t, new Else(this, then));
  }
}

export class Else<T extends GraphQL.Type> extends GraphQL.Expression {
  constructor(
    public readonly parent: If<T>,
    public readonly then: () => T
  ) {
    super();
  }

  public toVTL(): string {
    throw new Error('todo');
  }
}
