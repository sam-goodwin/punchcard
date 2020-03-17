import { GraphQL } from "./types";


export function $case(): Case<any> {

}

export class Case<T extends GraphQL.Type> {
  public when(condition: GraphQL.Bool, then: () => T): Case<T> {

  }
  public otherwise(then: () => T): T {

  }
}

export function $if<T extends GraphQL.Type>(condition: GraphQL.Bool, then: () => T): If<T> {

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
    return new Else(this, then);
  }
}

export class Else<T extends GraphQL.Type> {
  constructor(
    public readonly parent: If<T>,
    public readonly then: () => T
  ) {}
}

export function $else<T extends GraphQL.Type>(then: () => T): Else<T> {}