import { ElseBranch, IfBranch } from './statement';
import { VTL } from './vtl';
import { VBool, VNothing, VObject } from './vtl-object';

export function $if(condition: VBool, then: () => VTL<VObject | void>): VTL<VNothing>;
export function $if(condition: VBool, then: () => VTL<void>, Else: IfBranch<void> | ElseBranch<void>): VTL<VNothing>;
export function $if<T extends VObject>(condition: VBool, then: () => VTL<T>, Else: IfBranch<T> | ElseBranch<T>): VTL<T>;
export function *$if<T extends VObject | void>(condition: VBool, then: () => VTL<T>, Else?: IfBranch<T> | ElseBranch<T>): VTL<T> {
  return (yield new IfBranch(condition, then, Else)) as T;
}

export function $elseIf(condition: VBool, then: () => VTL<VObject>): IfBranch<VNothing>;
export function $elseIf<T extends VObject | void>(condition: VBool, then: () => VTL<T>, Else: IfBranch<T> | ElseBranch<T>): IfBranch<T>;
export function $elseIf(condition: VBool, then: () => VTL<VObject>, Else?: IfBranch<VObject | void> | ElseBranch<VObject | void>): IfBranch<VObject | void> {
  return new IfBranch(condition, then, Else);
}

export function $else<T extends VObject | void>(then: () => VTL<T>): ElseBranch<T> {
  return new ElseBranch(then);
}
