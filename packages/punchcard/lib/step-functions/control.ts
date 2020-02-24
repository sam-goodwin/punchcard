import { Condition } from './choice';
import { List } from './list';
import { Scope } from './scope';
import { Statement } from './statement';
import { Integer, Thing } from './thing';

export class WhileLoop extends Statement {
  public readonly kind: 'whileLoop' = 'whileLoop';
  constructor(public readonly condition: Condition, public readonly body: (scope: Scope) => void) {
    super();
  }
}

export function $while(condition: Condition, body: (scope: Scope) => void) {
  return new WhileLoop(condition, body);
}

export function $forEach<I extends Thing>(list: List<I>, f: (item: I, index: Integer, scope: Scope) => void) {
  // todo
}

export function $parallel(fn: Thing[]) {
  // todo
}

/**
 * Delete some state (by reference or id).
 *
 * @param state reference to some state
 */
export function $delete(state: State | string): void {
  // todo
}
