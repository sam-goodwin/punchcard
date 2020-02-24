import { Branch } from './choice';
import { WhileLoop } from './control';
import { Scope } from './scope';
import { Assign, State } from './state';
import { Task } from './task';
import { Try } from './try-catch';
import { Wait } from './wait';

export abstract class Node {
  public abstract readonly kind: Node.Kind;

  public visit<V extends Node.Visitor<T, C>, T, C>(visitor: V, context: C): T {
    return (visitor as any)[this.kind](this, context);
  }
}

export namespace Node {
  export type Kind = keyof Visitor;
  export interface Visitor<T = any, C = undefined> {
    assign<A extends Assign>(assign: A, context: C): T;
    branch<B extends Branch>(branch: B, context: C): T
    scope<S extends Scope>(scope: S, context: C): T;
    task<T extends Task>(task: T, context: C): T;
    try<T extends Try>(tryCatch: T, context: C): T;
    wait<W extends Wait>(wait: W, context: C): T;
    whileLoop<W extends WhileLoop>(whileLoop: W, context: C): T;
  }
  export namespace Guards {
    export function isAssign(a: any): a is Assign { return a.kind === 'assign'; }
    export function isBranch(a: any): a is Branch { return a.kind === 'branch'; }
    export function isState(a: any): a is State { return a.kind === 'state'; }
    export function isTask(a: any): a is Task { return a.kind === 'task'; }
    export function isTry(a: any): a is State { return a.kind === 'try'; }
    export function isWait(a: any): a is Wait { return a.kind === 'wait'; }
    export function isWhileLoop(a: any): a is WhileLoop { return a.kind === 'whileLoop'; }
  }
}