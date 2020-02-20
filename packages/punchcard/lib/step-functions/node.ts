import { Branch } from './choice';
import { WhileLoop } from './control';
import { Scope } from './scope';
import { Task } from './task';
import { TryCatch } from './try-catch';
import { Assign, Variable } from './variable';

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
    task<T extends Task>(task: T, context: C): T;
    tryCatch<T extends TryCatch>(tryCatch: T, context: C): T;
    scope<S extends Scope>(scope: S, context: C): T;
    variable<V extends Variable>(variable: V, context: C): T;
    whileLoop<W extends WhileLoop>(whileLoop: W, context: C): T;
  }
  export namespace Guards {
    export function isAssign(a: any): a is Assign { return a.kind === 'assign'; }
    export function isBranch(a: any): a is Branch { return a.kind === 'branch'; }
    export function isTask(a: any): a is Task { return a.kind === 'task'; }
    export function isVariable(a: any): a is Variable { return a.kind === 'variable'; }
    export function isWhileLoop(a: any): a is WhileLoop { return a.kind === 'whileLoop'; }
  }
}