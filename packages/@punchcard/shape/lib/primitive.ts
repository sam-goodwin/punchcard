import { Shape } from "./shape";

export abstract class DynamicShape<T extends any | unknown> extends Shape {
  public readonly Pin?: T; // pin T to the type.

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
  public readonly Kind: 'binaryShape' = 'binaryShape';
}

export class BoolShape extends Shape {
  public readonly Kind: 'boolShape' = 'boolShape';
}

export class StringShape extends Shape {
  public readonly Kind: 'stringShape' = 'stringShape';
}

export class NumberShape extends Shape {
  public readonly Kind: 'numberShape' = 'numberShape';
}

export class IntegerShape extends Shape {
  public readonly Kind: 'integerShape' = 'integerShape';
}

export class TimestampShape extends Shape {
  public readonly Kind: 'timestampShape' = 'timestampShape';
}

export class NothingShape extends Shape {
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
