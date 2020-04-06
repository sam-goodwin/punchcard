import { Shape } from '@punchcard/shape/lib/shape';
import { Build } from '../core/build';
import { DataSourceBindCallback } from './data-source';
import { VTL } from './vtl';
import { VBool, VObject } from './vtl-object';

/**
 * A piece of logic executed by AppSync with Velocity Templates.
 *
 * A series of Statements will be interpreted to generate a linear AppSync Resolver Pipeline.
 *
 * @see https://docs.aws.amazon.com/appsync/latest/devguide/pipeline-resolvers.html
 */
export type Statement<A = any> =
  | CallFunction<A>
  | IfBranch<A>
  | SetVariable<A>
;

export namespace Statement {
  export const Tag = Symbol.for('appsync.Statement.Tag');
  export type Tag = typeof Tag;

  export const Type = Symbol.for('appsync.Statement.Tag');
  export type Type = typeof Type;
}

/**
 * Guards for introspecting on VTLStatements.
 */
export namespace StatementGuards {
  export function isCall(a: any): a is CallFunction<VObject> {
    return a[Statement.Tag] === 'call';
  }

  export function isSet(a: any): a is SetVariable<VObject> {
    return a[Statement.Tag] === 'set';
  }

  export function isIf(a: any): a is IfBranch<VObject | void> {
    return a[Statement.Tag] === 'if';
  }
}

/**
 * Call a data source with a request and receive a response.
 */
export class CallFunction<T = VObject> {
  readonly [Statement.Tag]: 'call' = 'call';
  readonly [Statement.Type]: T;

  constructor(
    public readonly dataSourceProps: Build<DataSourceBindCallback>,
    public readonly request: VObject,
    public readonly responseType: Shape
  ) {}
}

export function *call<T extends Shape, U extends Shape>(
  dataSourceProps: Build<DataSourceBindCallback>,
  request: VObject.Of<T>,
  responseType: U
): VTL<VObject.Of<U>> {
  return (yield new CallFunction(dataSourceProps, request, responseType)) as VObject.Of<U>;
}

/**
 * Stash a value for use later.
 */
export class SetVariable<T = VObject> {
  readonly [Statement.Tag]: 'set' = 'set';
  readonly [Statement.Type]: T;

  constructor(
    public readonly value: T,
    public readonly id?: string
  ) {}
}

export function *set<T extends VObject>(value: T, id?: string): VTL<T> {
  return (yield new SetVariable(value, id)) as T;
}

/**
 * Represents a series of if branches in VTL-land.
 */
export class IfBranch<T> {
  readonly [Statement.Tag]: 'if' = 'if';
  readonly [Statement.Type]: T;

  constructor(
    public readonly condition: VBool,
    public readonly then: () => VTL<T>,
    public readonly elseBranch?: IfBranch<T> | ElseBranch<T>
  ) {}
}

export class ElseBranch<T> {
  constructor(public readonly then: () => VTL<T>) {}
}
