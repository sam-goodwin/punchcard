import { Condition } from "./choice";
import { Scope } from "./scope";
import { Statement } from "./statement";
import { List, Thing } from "./thing";

export class WhileLoop extends Statement {
  public readonly kind: 'whileLoop' = 'whileLoop';
  constructor(public readonly condition: Condition, public readonly body: (scope: Scope) => void) {
    super();
  }
}

export function While(condition: Condition, body: (scope: Scope) => void) {
  return new WhileLoop(condition, body);
}

export function ForEach<I extends Thing>(list: List<I>, f: (item: I, scope: Scope) => void) {
  // todo
}

export function Parallel(fn: Array<(scope: Scope) => void>) {
  // todo
}

export const $forEach = ForEach;
export const $ForEach = ForEach;
export const $parallal = Parallel;
export const $Parallal = Parallel;
export const $while = While;
export const $While = While;
