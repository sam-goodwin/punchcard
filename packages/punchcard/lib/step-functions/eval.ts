import { ShapeOrRecord, Value } from '@punchcard/shape';
import { State } from './state';
import { Task } from './task';
import { SFN, Thing } from './thing';

export declare function $lit<T extends ShapeOrRecord>(type: T, value: Value.Of<T>): Thing.Of<T>;

// tslint:disable: unified-signatures
export declare function $get<V extends State>(state: V): State.GetThing<V>;

export function $<V extends State>(state: V): State.GetThing<V>;

export function $<T extends Task.DSL>(task: T): Task.GetDSL<T>;

/**
 * Evaluate a sequence of tokens and produce a statement in the current scope.
 *
 * @param tokens sequence of tokens representing the statement.
 */
export function $(...tokens: any[]): any {
  return null as any;
}

export interface Vars {
  [id: string]: ShapeOrRecord;
}

export function $set<T extends Thing, ID extends string>(id: ID, thing: T): Generator<unknown, State<T, ID>>;
export function $set<T extends Thing, ID extends string>(id: ID, thing: SFN<T>): Generator<unknown, State<T, ID>>;
export function $set<T extends ShapeOrRecord, ID extends string>(id: ID, type: T, value: Value.Of<T>): Generator<unknown, State<Thing.Of<T>, ID>>;
export function $set<T extends Thing>(state: State<T>, value: T): Generator<unknown, void>;
export function $set<T extends Thing>(state: State<T>, value: Value.Of<Thing.GetType<T>>): Generator<unknown, void>;

export function $set(...args: any[]): any {
  throw new Error('todo');
}

/**
 * Declare multiple variables by name and type.
 *
 * ```ts
 * const { a, b } = yield* $var({
 *   a: string,
 *   b: array(string)
 * });
 * ```
 * @param vars variables to declare
 */
export function $pass<V extends Vars>(vars: V): Generator<unknown, {
  [ID in Extract<keyof V, string>]: State<Thing.Of<V[ID]>, ID>;
}>;

export function $pass<ID extends string, T extends ShapeOrRecord>(id: ID, type: T): Generator<unknown, State<Thing.Of<T>, ID>>;
export function $pass<ID extends string, V>(id: ID, value: V): Generator<unknown, State<Thing.Of<Value.InferShape<V>>, ID>>;
export function $pass<ID extends string, T extends ShapeOrRecord>(id: ID, type: T, value: Thing.Value<T>): Generator<unknown, State<Thing.Of<T>, ID>>;
// export function $var<ID extends string, V>(id: ID, value: V): Generator<unknown, State<Thing.Of<Value.InferShape<V>>, ID>>;

export function $pass(...args: any[]): any {
  throw new Error('todo');
}