import { DistributeUnionShape, RecordShape, Shape } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { VTL } from '../lang/vtl';
import { VObject } from '../lang/vtl-object';

export type FieldResolver<Self extends RecordShape, T extends Shape, ReturnsValue extends boolean = true> =
  & ReturnsValue extends true ? ThisType<VObject.Of<Self>> & {
    readonly resolve: T extends FunctionShape<infer Args, infer Returns> ?
      // if it's a Function type, expect a function taking those args and returning an object
      (args: { [arg in keyof Args]: VObject.Of<Args[arg]>; }, self: VObject.Of<DistributeUnionShape<Self>>) => VTL<VObject.Of<DistributeUnionShape<Returns>>> :
      // no args if it is not a Function type
      (self: VObject.Of<Self>) => VTL<VObject.Of<DistributeUnionShape<T>>>
    ;
  } : ThisType<VObject.Of<Self>> & {
    readonly resolve?: T extends FunctionShape<infer Args, any> ?
      // if it's a Function type, expect a function taking those args and returning an object
      (args: { [arg in keyof Args]: VObject.Of<Args[arg]>; }, self: VObject.Of<Self>) => VTL<void> :
      // no args if it is not a Function type
      (self: VObject.Of<Self>) => VTL<void>
    ;
  };
