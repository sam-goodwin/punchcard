import { ArrayShape, BinaryShape, BoolShape, DynamicShape, IntegerShape, MapShape, NothingShape, NumberShape, RecordShape, SetShape, StringShape, TimestampShape, Visitor as ShapeVisitor } from '@punchcard/shape';
import { VTL } from './vtl';

export class VTLVisitor implements ShapeVisitor<VTL.Object, VTL.Expression> {
  public static readonly instance = new VTLVisitor();

  public arrayShape(shape: ArrayShape<any>, context: VTL.Expression<any>): VTL.Object<any> {
    throw new Error("Method not implemented.");
  }
  public binaryShape(shape: BinaryShape, context: VTL.Expression<any>): VTL.Object<any> {
    throw new Error("Method not implemented.");
  }
  public boolShape(shape: BoolShape, context: VTL.Expression<any>): VTL.Object<any> {
    throw new Error("Method not implemented.");
  }
  public recordShape(shape: RecordShape<any, any>, context: VTL.Expression<any>): VTL.Object<any> {
    throw new Error("Method not implemented.");
  }
  public dynamicShape(shape: DynamicShape<any>, context: VTL.Expression<any>): VTL.Object<any> {
    throw new Error("Method not implemented.");
  }
  public integerShape(shape: IntegerShape, context: VTL.Expression<any>): VTL.Object<any> {
    throw new Error("Method not implemented.");
  }
  public mapShape(shape: MapShape<any>, context: VTL.Expression<any>): VTL.Object<any> {
    throw new Error("Method not implemented.");
  }
  public nothingShape(shape: NothingShape, context: VTL.Expression<any>): VTL.Object<any> {
    throw new Error("Method not implemented.");
  }
  public numberShape(shape: NumberShape, context: VTL.Expression<any>): VTL.Object<any> {
    throw new Error("Method not implemented.");
  }
  public setShape(shape: SetShape<any>, context: VTL.Expression<any>): VTL.Object<any> {
    throw new Error("Method not implemented.");
  }
  public stringShape(shape: StringShape, context: VTL.Expression<any>): VTL.Object<any> {
    throw new Error("Method not implemented.");
  }
  public timestampShape(shape: TimestampShape, context: VTL.Expression<any>): VTL.Object<any> {
    throw new Error("Method not implemented.");
  }
}