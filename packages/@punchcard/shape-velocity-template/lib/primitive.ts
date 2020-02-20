import { BoolShape, integer, IntegerShape, NothingShape, NumberShape, NumericShape, StringShape } from '@punchcard/shape';
import { ExpressionOrLiteral } from './expression';
import { FunctionCall } from './function-call';
import { Object } from './object';

export abstract class Numeric<N extends NumericShape> extends Object<N> {
  public plus(value: ExpressionOrLiteral<NumericShape>) {
    // todo
  }
}
export class Number extends Numeric<NumberShape> {}
export class Integer extends Numeric<IntegerShape> {}

export class String extends Object<StringShape> {
  public get length(): Integer {
    return new Integer(new FunctionCall(this, 'length', [], integer));
  }
}
export class Nothing extends Object<NothingShape> {}

export class Bool extends Object<BoolShape> {
  // todo: and, or
}