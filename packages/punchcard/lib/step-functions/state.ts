import { Expression } from './expression';
import { Scope } from './scope';
import { Statement } from './statement';
import { Thing } from './thing';

/**
 * A value stored in the Step Function's State.
 */
export class State<T extends Thing = any, ID extends string = string> {
  constructor(public readonly id: ID, public readonly thing: T, scope?: Scope) {
  }
}
export namespace State {
  export type GetID<V extends State> = V extends State<any, infer I> ? I : never;
  export type GetThing<V extends State> = V extends State<infer T> ? T : never;
  export type GetShape<V extends State> = Thing.GetType<GetThing<V>>;
}

/**
 * Assign some state to a value.
 */
export class Assign<T extends Thing = any> extends Statement {
  public readonly kind: 'assign' = 'assign';

  constructor(public readonly variable: State<T>, public readonly value: T, scope?: Scope) {
    super(scope);
    const expr: Expression = Thing.getExpression(value);
  }
}
