import { Shape } from './shape';

export type PrimitiveShapes =
  | AnyShape
  | UnknownShape
  | BoolShape
  | StringShape
  | NumberShape
  | IntegerShape
  | TimestampShape
  | NothingShape
  ;

export abstract class DynamicShape<T extends any | unknown> extends Shape {
  public abstract readonly Tag: 'any' | 'unknown';

  public readonly Kind: 'dynamicShape' = 'dynamicShape';
}

export class AnyShape extends DynamicShape<any> {
  public readonly Tag: 'any' = 'any';
  public readonly FQN: 'punchcard.any' = 'punchcard.any';
}

export class UnknownShape extends DynamicShape<unknown> {
  public readonly Tag: 'unknown' = 'unknown';
  public readonly FQN: 'punchcard.unknown' = 'punchcard.unknown';
}

export class BinaryShape extends Shape {
  public readonly Kind: 'binaryShape' = 'binaryShape';
  public readonly FQN: 'binary' = 'binary';
}

export class BoolShape extends Shape {
  public readonly Kind: 'boolShape' = 'boolShape';
  public readonly FQN: 'bool' = 'bool';
}

export class StringShape extends Shape {
  public readonly Kind: 'stringShape' = 'stringShape';
  public readonly FQN: 'string' = 'string';
}

export abstract class NumericShape extends Shape {
  public readonly isNumeric: true = true;
}
export class NumberShape extends NumericShape {
  public readonly Kind: 'numberShape' = 'numberShape';
  public readonly FQN: 'number' = 'number';
}

export class IntegerShape extends NumericShape {
  public readonly Kind: 'integerShape' = 'integerShape';
  public readonly FQN: 'integer' = 'integer';
}

export class TimestampShape extends Shape {
  public readonly Kind: 'timestampShape' = 'timestampShape';
  public readonly FQN: 'timestamp' = 'timestamp';
}

export class NothingShape extends Shape {
  public readonly Kind: 'nothingShape' = 'nothingShape';
  public readonly FQN: 'nothing' = 'nothing';
}

export class NeverShape extends Shape {
  public readonly Kind: 'neverShape' = 'neverShape';
  public readonly FQN: 'never' = 'never';
}

export const nothing = new NothingShape();
export const any = new AnyShape();
export const unknown = new UnknownShape();

export const binary = new BinaryShape();
export const bool = new BoolShape();
export const boolean = bool;
export const string = new StringShape();
export const number = new NumberShape();
export const int = new IntegerShape();
export const integer = int;
export const timestamp = new TimestampShape();
