import { ArrayShape, ShapeOrRecord, StringShape, Value } from '@punchcard/shape';
import { Literal, Reference } from './expression';
import { Node } from './node';
import { Scope } from './scope';
import { Statement } from './statement';
import { Type } from './symbols';
import { Bool, List, Number, String, Thing } from './thing';

export interface Vars {
  [id: string]: Thing;
}
export namespace Vars {
  export type Declare<V extends Vars> = {
    [ID in keyof V]: Variable<V[ID], ID extends string ? ID : never>;
  };
}

export function $ref<V extends Variable>(variable: V) {

}

// tslint:disable: ban-types

export function $set<ID extends string, T extends Thing>(id: ID, thing: T): Variable<T, ID>;
export function $set<V extends Variable>(variable: V, thing: Variable.GetThing<V>): V;

export function $set<ID extends string, T extends Thing>(id: ID, thing: Thing | Variable<T>): any {

}

export function $<ID extends string, T extends ShapeOrRecord>(id: ID, type: T): Variable<Thing.Of<T>, ID>;
export function $<ID extends string, T extends Thing>(id: ID, thing: T): Variable<T, ID>;
export function $<T extends ShapeOrRecord>(type: T, value: Value.Of<T>): Thing.Of<T>;
export function $<V extends Variable>(variable: V): Variable.GetThing<V>;
export function $<V extends Vars>(vars: Vars): Vars.Declare<V>;
export function $<ID extends string, V>(id: ID, value: V): Variable<Thing.Of<Value.InferShape<V>>, ID>;

export function $(...args: any[]): any {
  if (Node.Guards.isVariable(args[0])) {
    return args[0].$;
  } else {
    // return Lit(a, b, c);
  }
}

export const $expr = $;

const a = $('a', {
  key: {
    hello: 'hello'
  }
});


export function $state() {

}

export class Variable<T extends Thing = any, ID extends string = any> extends Statement {
  public readonly kind: 'variable' = 'variable';

  private _$: T;
  public set $(value: T) {
    // write an Assign statement to the current scope.
    new Assign(this, value);
    this._$ = value;
  }
  public get $(): T {
    return Thing.of(this.thing[Type], new Reference(this));
  }

  constructor(public readonly id: ID, private readonly thing: T, scope?: Scope) {
    super(scope);
    this.$ = thing;
  }
}
export namespace Variable {
  export type GetID<V extends Variable> = V extends Variable<any, infer I> ? I : never;
  export type GetThing<V extends Variable> = V extends Variable<infer T> ? T : never;
}

export class Assign<T extends Thing = any> extends Statement {
  public readonly kind: 'assign' = 'assign';

  constructor(public readonly variable: Variable<any, T>, public readonly value: T, scope?: Scope) {
    super(scope);
  }
}
