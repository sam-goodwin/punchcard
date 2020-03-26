import { AnyShape, ArrayShape, BinaryShape, BoolShape, DynamicShape, IntegerShape, MapShape, NothingShape, NumberShape, Record, RecordShape, SetShape, Shape, ShapeVisitor, StringShape, TimestampShape, UnknownShape } from '@punchcard/shape';
import { VExpression } from '../syntax/expression';
import { VAny, VUnknown } from './any';
import { VBinary } from './binary';
import { VBool } from './bool';
import { VList } from './list';
import { VMap } from './map';
import { VNothing } from './nothing';
import { VInteger, VNumber } from './numeric';
import { VObject } from './object';
import { VRecord } from './record';
import { VSet } from './set';
import { VString } from './string';
import { VTimestamp } from './timestamp';

export class Visitor implements ShapeVisitor<VObject, VExpression> {
  public static defaultInstance = new Visitor();

  public arrayShape(shape: ArrayShape<any>, expr: VExpression): VList {
    return new VList(shape, expr);
  }
  public binaryShape(shape: BinaryShape, expr: VExpression): VBinary {
    return new VBinary(shape, expr);
  }
  public boolShape(shape: BoolShape, expr: VExpression): VBool {
    return new VBool(shape, expr);
  }
  public recordShape(shape: RecordShape<any>, expr: VExpression): VRecord {
    return new VRecord(shape, expr);
  }
  public dynamicShape(shape: DynamicShape<any>, expr: VExpression): VAny | VUnknown {
    if (shape.Tag === 'any') {
      return new VAny(shape as AnyShape, expr);
    } else {
      return new VUnknown(shape as UnknownShape, expr);
    }
  }
  public integerShape(shape: IntegerShape, expr: VExpression): VInteger {
    return new VInteger(shape, expr);
  }
  public mapShape(shape: MapShape<Shape>, expr: VExpression): VMap<VObject> {
    return new VMap(shape, expr);
  }
  public nothingShape(shape: NothingShape, expr: VExpression): VNothing {
    throw new VNothing(shape, expr);
  }
  public numberShape(shape: NumberShape, expr: VExpression): VNumber {
    // tslint:disable-next-line: no-construct
    return new VNumber(shape, expr);
  }
  public setShape(shape: SetShape<Shape>, expr: VExpression): VSet<VObject> {
    return new VSet(shape, expr);
  }
  public stringShape(shape: StringShape, expr: VExpression): VString {
    // tslint:disable-next-line: no-construct
    return new VString(shape, expr);
  }
  public timestampShape(shape: TimestampShape, expr: VExpression): VTimestamp {
    return new VTimestamp(shape, expr);
  }
}
