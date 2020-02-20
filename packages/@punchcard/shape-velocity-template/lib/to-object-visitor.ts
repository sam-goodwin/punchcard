import { ArrayShape, BinaryShape, BoolShape, DynamicShape, IntegerShape, MapShape, NothingShape, NumberShape, RecordShape, SetShape, StringShape, TimestampShape, Visitor as ShapeVisitor } from '@punchcard/shape';
import { Expression } from './expression';
import { List } from './list';
import { Object } from './object';
import { Bool, Integer, Nothing, Number, String } from './primitive';

export class ToObjectVisitor implements ShapeVisitor<Object, Expression> {
  public static readonly instance = new ToObjectVisitor();

  public arrayShape(shape: ArrayShape<any>, expression: Expression<any>): List {
    return new List(expression);
  }
  public binaryShape(shape: BinaryShape, expression: Expression<any>): Object<any> {
    throw new Error("Method not implemented.");
  }
  public boolShape(shape: BoolShape, expression: Expression<any>): Bool {
    return new Bool(expression);
  }
  public recordShape(shape: RecordShape<any, any>, expression: Expression<any>): Object<any> {
    throw new Error("Method not implemented.");
  }
  public dynamicShape(shape: DynamicShape<any>, expression: Expression<any>): Object<any> {
    throw new Error("Method not implemented.");
  }
  public integerShape(shape: IntegerShape, expression: Expression<any>): Integer {
    return new Integer(expression);
  }
  public mapShape(shape: MapShape<any>, expression: Expression<any>): Object<any> {
    throw new Error("Method not implemented.");
  }
  public nothingShape(shape: NothingShape, expression: Expression<any>): Object<any> {
    return new Nothing(expression);
  }
  public numberShape(shape: NumberShape, expression: Expression<any>): Number {
    return new Number(expression);
  }
  public setShape(shape: SetShape<any>, expression: Expression<any>): Object<any> {
    throw new Error("Method not implemented.");
  }
  public stringShape(shape: StringShape, expression: Expression<any>): String {
    return new String(expression);
  }
  public timestampShape(shape: TimestampShape, expression: Expression<any>): String {
    return new String(expression);
  }
}