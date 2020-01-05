import { Shape } from "./shape";

export class BoolShape extends Shape {
  public readonly Kind = 'boolShape';
}

export class StringShape extends Shape {
  public readonly Kind = 'stringShape';
}

export class NumberShape extends Shape {
  public readonly Kind = 'numberShape';
}

export class TimestampShape extends Shape {
  public readonly Kind = 'timestampShape';
}

export const bool = new BoolShape();
export const string = new StringShape();
export const number = new NumberShape();
export const timestamop = new TimestampShape();
