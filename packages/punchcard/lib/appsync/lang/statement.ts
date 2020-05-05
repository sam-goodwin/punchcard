import { Shape } from '@punchcard/shape/lib/shape';
import { Build } from '../../core/build';
import { DataSourceBindCallback } from '../api/data-source';
import { InterpreterState } from '../api/interpreter';
import { VExpression } from './expression';
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
  | CallFunction<A>
  | IfBranch<A>
  | Stash
  | Write
  | 'get-state'
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
  export function isIf(a: any): a is IfBranch<VObject | void> {
    return a[Statement.Tag] === 'if';
  }
  export function isWrite(a: any): a is Write {
    return a[Statement.Tag] === 'write';
  }
  export function isStash(a: any): a is Stash {
    return a[Statement.Tag] === 'stash';
  }
  export function isGetState(a: any): a is GetState {
    return a === GetState;
  }
}

export function *getState(): VTL<InterpreterState> {
  return (yield 'get-state') as any;
}
export type GetState = typeof GetState;
export const GetState = 'get-state';

export function *write(a: VExpression | VObject): VTL<void> {
  return (yield new Write(VObject.isObject(a) ? VObject.getExpression(a) : a)) as void;
}

export class Write {
  public readonly [Statement.Tag]: 'write' = 'write';
  constructor(public readonly expr: VExpression) {}
}

export function *stash<T extends VObject>(v: VObject, props?: StashProps): VTL<T> {
  console.log(new Stash(v, props));
  return (yield new Stash(v, props)) as T;
}

export interface StashProps {
  id?: string;
  local?: boolean;
}
export class Stash {
  public readonly [Statement.Tag]: 'stash' = 'stash';
  public readonly id: string | undefined;
  public readonly local: boolean;
  constructor(
    public readonly value: VObject,
    props?: StashProps
  ) {
    this.id = props?.id;
    this.local = (props?.local === undefined ? false : props?.local);
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
 * Represents a series of if branches in VTL-land.
 */
export class IfBranch<T = any, Stmt = any> {
  readonly [Statement.Tag]: 'if' = 'if';
  readonly [Statement.Type]: T;
  readonly branchType: 'if' = 'if';

  constructor(
    public readonly condition: VBool,
    public readonly then: () => Generator<Stmt, T>,
    public readonly elseBranch?: IfBranch<T> | ElseBranch<T>
  ) {}
}

export class ElseBranch<T = any> {
  public readonly branchType: 'else' = 'else';
  constructor(public readonly then: () => Generator<any, T>) {}
}

export function isIfBranch(a: any): a is IfBranch<VObject | void> {
  return a.branchType === 'if';
}

export function isElseBranch(a: any): a is ElseBranch<VObject | void> {
  return a.branchType === 'else';
}
