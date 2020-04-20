import { Shape } from '@punchcard/shape/lib/shape';
import { Build } from '../../core/build';
import { DataSourceBindCallback } from '../data-source';
import { VTL } from './vtl';
import { VBool, VNothing, VObject } from './vtl-object';

/**
 * A piece of logic executed by AppSync with Velocity Templates.
 *
 * A series of Statements will be interpreted to generate a linear AppSync Resolver Pipeline.
 *
 * @see https://docs.aws.amazon.com/appsync/latest/devguide/pipeline-resolvers.html
 */
export type Statement<A = any> =
  | Directive<A>
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
  export function isDirective(a: any): a is Directive {
    return a[Statement.Tag] === 'directive';
  }
  export function isIf(a: any): a is IfBranch<VObject | void> {
    return a[Statement.Tag] === 'if';
  }
  export function isSet(a: any): a is SetVariable<VObject> {
    return a[Statement.Tag] === 'set';
  }
}

export class Directive<T = VNothing> {
  readonly [Statement.Tag]: 'directive' = 'directive';
  readonly [Statement.Type]: T;

  constructor(
    public readonly directives: string[]
  ) {}
}

export function *directive(...directives: string[]): VTL<VNothing> {
  return (yield new Directive(directives)) as any;
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

export function *setVariable<T extends VObject>(value: T, id?: string): VTL<T> {
  return (yield new SetVariable(value, id)) as T;
}

/**
 * Represents a series of if branches in VTL-land.
 */
export class IfBranch<T, Stmt = any> {
  readonly [Statement.Tag]: 'if' = 'if';
  readonly [Statement.Type]: T;
  readonly branchType: 'if' = 'if';

  constructor(
    public readonly condition: VBool,
    public readonly then: () => Generator<Stmt, T>,
    public readonly elseBranch?: IfBranch<T> | ElseBranch<T>
  ) {}
}

export class ElseBranch<T> {
  public readonly branchType: 'else' = 'else';
  constructor(public readonly then: () => Generator<any, T>) {}
}

export function isIfBranch(a: any): a is IfBranch<VObject | void> {
  return a.branchType === 'if';
}

export function isElseBranch(a: any): a is ElseBranch<VObject | void> {
  return a.branchType === 'else';
}
