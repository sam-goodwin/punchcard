import { Shape } from "./shape";

export class StringShape extends Shape {
  public readonly Kind = 'string';
}

export class NumberShape extends Shape {
  public readonly Kind = 'number';
}

export const string = new StringShape();
export const number = new NumberShape();