import { Shape } from './shape';
import { Value } from './value';

export abstract class DynamicShape<T extends any | unknown> extends Shape {
  public readonly [Value.Tag]: T;

  public abstract readonly Tag: 'any' | 'unknown';

  public readonly Kind: 'dynamicShape' = 'dynamicShape';
}
export class AnyShape extends DynamicShape<any> {
  public readonly Tag: 'any' = 'any';
}
export class UnknownShape extends DynamicShape<any> {
  public readonly Tag: 'unknown' = 'unknown';
}

export class BinaryShape extends Shape {
  public readonly [Value.Tag]: Buffer;
  public readonly Kind: 'binaryShape' = 'binaryShape';
}

export class BoolShape extends Shape {
  public readonly [Value.Tag]: boolean;
  public readonly Kind: 'boolShape' = 'boolShape';
}

export class StringShape extends Shape {
  public readonly [Value.Tag]: string;
  public readonly Kind: 'stringShape' = 'stringShape';
}

export abstract class NumericShape extends Shape {
  public readonly [Value.Tag]: number;
  public readonly isNumeric: true = true;
}
export class NumberShape extends NumericShape {
  public readonly Kind: 'numberShape' = 'numberShape';
}

export class IntegerShape extends NumericShape {
  public readonly Kind: 'integerShape' = 'integerShape';
}

export class TimestampShape extends Shape {
  public readonly [Value.Tag]: Date;
  public readonly Kind: 'timestampShape' = 'timestampShape';
}

export class NothingShape extends Shape {
  public readonly [Value.Tag]: undefined | null | void;
  public readonly Kind: 'nothingShape' = 'nothingShape';
}

export const nothing = new NothingShape();
export const any = new AnyShape();
export const unknown = new UnknownShape();

export const binary = new BinaryShape();
export const bool = new BoolShape();
export const string = new StringShape();
export const number = new NumberShape();
export const int = new IntegerShape();
export const integer = new IntegerShape();
export const timestamp = new TimestampShape();
