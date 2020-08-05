import { UnionToIntersection } from '@punchcard/shape';
import { ElseBranch, IfBranch } from './statement';
import { VBool, VNothing, VObject, VUnion } from './vtl-object';

export type IsUnion<T extends VObject> = UnionToIntersection<VObject.TypeOf<T>['FQN']> extends never ? true : false;

type VNothingIfVoid<T extends VObject | void> = T extends VObject ? T : VNothing;

export class If<T extends VObject | void = VObject | void, U extends VObject = VObject> {
  constructor(
    public readonly condition: VBool,
    public readonly then: () => Generator<any, T>,
    public readonly parent?: If<VObject | void, VObject>
  ) {}

  [Symbol.iterator](): Generator<any, VUnion<VNothing | U>> {
    const self: If = this as any;
    return (function*() {
      return yield toIfBranch(self);
    })();
  }

  public elseIf<T2 extends VObject | void>(
    condition: VBool,
    then: () => Generator<any, T2>
  ): VNothingIfVoid<T2> extends U ? If<T2, U> : If<T2, VNothingIfVoid<T> | VNothingIfVoid<T2>> {
    return new If(condition, then, this as any) as any;
  }

  public else<T2 extends VObject | void>(then: () => Generator<any, T2>):
    VNothingIfVoid<T2> extends U ?
      Generator<any, T2> :
      Generator<any, VUnion<U>> {
    const self: If = this as any;
    return (function*() {
      return yield toIfBranch(self, new ElseBranch(then));
    })() as any;
  }
}

function toIfBranch(next: If, elseIf?: IfBranch | ElseBranch): IfBranch {
  const branch = new IfBranch(next.condition, next.then, elseIf);
  if (next.parent !== undefined) {
    return toIfBranch(next.parent!, branch);
  } else {
    return branch;
  }
}

export function $if<T extends VObject | void>(
  condition: VBool,
  then: () => Generator<any, T>
): If<T, VNothingIfVoid<T>> {
  return new If(condition, then);
}
