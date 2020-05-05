import { Shape } from '@punchcard/shape';
import { ElseBranch, IfBranch } from './statement';
import { VTL } from './vtl';
import { VBool, VNothing, VObject } from './vtl-object';

export function $if<T extends VObject>(
  condition: VBool,
  then: () => Generator<any, T>,
  elseIf: IfBranch<T> | ElseBranch<T>
): Generator<any, T>;

export function $if(
  condition: VBool,
  then: () => Generator<any, void>,
  elseIf: IfBranch<void> | ElseBranch<void>
): Generator<any, VNothing>;

export function $if(
  condition: VBool,
  then: () => Generator<any, VObject | void>
): Generator<any, VNothing>;

export function *$if<T>(
  condition: VBool,
  then: () => Generator<any, T>,
  elseIf?: IfBranch<T> | ElseBranch<T>
): Generator<any, T> {
  return (yield new IfBranch(condition, then, elseIf)) as T;
}

export function $elseIf(
  condition: VBool,
  then: () => Generator<any, VObject>
): IfBranch<VNothing>;

export function $elseIf<T>(
  condition: VBool,
  then: () => Generator<any, T>,
  elseIf: IfBranch<T> | ElseBranch<T>
): IfBranch<T>;

export function $elseIf(
  condition: VBool,
  then: () => Generator<any, VObject>,
  elseIf?: IfBranch<VObject | void> | ElseBranch<VObject | void>
): IfBranch<VObject | void> {
  return new IfBranch(condition, then, elseIf);
}

export function $else<T>(then: () => Generator<any, T>): ElseBranch<T> {
  return new ElseBranch(then);
}
