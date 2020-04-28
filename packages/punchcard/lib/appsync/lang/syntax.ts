import { Shape } from '@punchcard/shape';
import { ElseBranch, IfBranch, setVariable } from './statement';
import { VTL, vtl } from './vtl';
import { VBool, VNothing, VObject } from './vtl-object';

export function $if<T>(
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

export function $if<T>(
  condition: VBool,
  then: () => Generator<any, T>,
  elseIf?: IfBranch<T> | ElseBranch<T>
): {
  elseIf: any;
} & Generator<any, T> {
  const g = (function*() {
    return (yield new IfBranch(condition, then, elseIf)) as T;
  })();
  (g as any).elseIf = (
    condition: VBool,
    then: () => Generator<any, any>,
    Else?: IfBranch<any> | ElseBranch<any>
  ) => new IfBranch(condition, then, Else);
  (g as any).else = (then: () => Generator<any, any>) => new ElseBranch(then);

  return g as any;
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


// export function *$var<T extends Shape>(shape: T, props?: {
//   id?: string
//   locale?: boolean
// }): VTL<Var<T>> {
//   const obj = yield* setVariable({
//     ...(props || {})
//   });
//   return new Var<T>(shape, obj);
// }

// export class Var<T extends Shape> {
//   constructor(
//     public readonly shape: T,
//     public readonly obj: VObject.Of<T>
//   ) {}
//   public get(): VObject.Of<T> {
//     throw new Error('not implemented');
//   }
//   public set(value: VObject.Like<T>): VTL<VObject.Of<T>> {
//     throw new Error('not implemented');
//   }
// }
