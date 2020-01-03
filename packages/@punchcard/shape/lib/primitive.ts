import { isShape, Shape } from "./shape";

export class StringShape extends Shape {
  public readonly Kind = 'stringShape';
}

export class NumberShape extends Shape {
  public readonly Kind = 'numberShape';
}

export const string = new StringShape();
export const number = new NumberShape();

export const isStringShape = (a: any): a is StringShape => isShape(a) && a.Kind === 'stringShape';
export const isNumberShape = (a: any): a is NumberShape => isShape(a) && a.Kind === 'numberShape';
