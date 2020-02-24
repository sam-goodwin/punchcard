import { Node } from './node';
import { Scope } from './scope';

/**
 * A statement is an execution within some scope.
 *
 * Scopes have a linear list of statements that will be executed in order
 * by the State Machine.
 */
export abstract class Statement extends Node {
  public readonly globalId: string;
  public readonly scope: Scope;

  constructor(scope?: Scope) {
    super();
    this.scope = scope || Thread.get()!;
    if (this.scope === undefined) {
      throw new Error(`no scope provided and no global scope found for statement`);
    }
    this.scope.addStatement(this);
    this.globalId = this.scope.newId();
  }
}
