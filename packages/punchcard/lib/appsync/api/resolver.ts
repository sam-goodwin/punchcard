import { DistributeUnionShape, Shape, TypeShape } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { VTL } from '../lang/vtl';
import { VObject } from '../lang/vtl-object';

export type FieldResolver<Self extends TypeShape, T extends Shape, ReturnsValue extends boolean = true> =
  & ReturnsValue extends true ? ThisType<SelfType<Self>> & {
    readonly resolve: T extends FunctionShape<infer Args, infer Returns> ?
      // if it's a Function type, expect a function taking those args and returning an object
      (
        args: { [arg in keyof Args]: VObject.Of<Args[arg]>; },
        self: SelfType<Self>
      ) => VTL<VObject.Of<DistributeUnionShape<Returns>>> :
      // no args if it is not a Function type
      (self: VObject.Of<Self>) => VTL<VObject.Of<DistributeUnionShape<T>>>
    ;
  } : ThisType<SelfType<Self>> & {
    readonly resolve?: T extends FunctionShape<infer Args, any> ?
      // if it's a Function type, expect a function taking those args and returning an object
      (
        args: { [arg in keyof Args]: VObject.Of<Args[arg]>; },
        self: SelfType<Self>
      ) => VTL<void> :
      // no args if it is not a Function type
      (self: SelfType<Self>) => VTL<void>
    ;
  }
;

type SelfType<T extends Shape> =
  T extends TypeShape<infer M> ? {
    [m in keyof M]: VObject.Of<M[m]>;
  }:
  VObject.Of<T>
;
