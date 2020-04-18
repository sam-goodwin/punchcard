import { ElseBranch, IfBranch } from './statement';
import { VBool, VNothing, VObject } from './vtl-object';

export function $if<T extends VObject>(
  condition: VBool,
  then: () => Generator<any, T>,
  Else: IfBranch<T> | ElseBranch<T>
): Generator<any, T>;

export function $if(
  condition: VBool,
  then: () => Generator<any, void>,
  Else: IfBranch<void> | ElseBranch<void>
): Generator<any, VNothing>;

export function $if(
  condition: VBool,
  then: () => Generator<any, VObject | void>
): Generator<any, VNothing>;

export function $if<T extends VObject | void>(
  condition: VBool,
  then: () => Generator<any, T>,
  Else?: IfBranch<T> | ElseBranch<T>
): {
  elseIf: any;
} & Generator<any, T> {
  const g = (function*() {
    return (yield new IfBranch(condition, then, Else)) as T;
  })();
  (g as any).elseIf = (
    condition: VBool,
    then: () => Generator<any, any>,
    Else?: IfBranch<any> | ElseBranch<any>
  ) => new IfBranch(condition, then, Else);
  (g as any).else = (then: () => Generator<any, any>) => new ElseBranch(then)

  return g as any;
}

export function $elseIf(
  condition: VBool,
  then: () => Generator<any, VObject>
): IfBranch<VNothing>;

export function $elseIf<T extends VObject | void>(
  condition: VBool,
  then: () => Generator<any, T>,
  Else: IfBranch<T> | ElseBranch<T>
): IfBranch<T>;

export function $elseIf(
  condition: VBool,
  then: () => Generator<any, VObject>,
  Else?: IfBranch<VObject | void> | ElseBranch<VObject | void>
): IfBranch<VObject | void> {
  return new IfBranch(condition, then, Else);
}

export function $else<T extends VObject | void>(then: () => Generator<any, T>): ElseBranch<T> {
  return new ElseBranch(then);
}
