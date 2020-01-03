import { isShape, Shape } from "./shape";
import { Visitor } from "./visitor";

export class StringShape extends Shape {
  public readonly Kind = 'stringShape';

  public visit<V extends Visitor>(visitor: V): ReturnType<V[this["Kind"]]> {
    return visitor.stringShape(this) as ReturnType<V[this["Kind"]]>;
  }
}

export class NumberShape extends Shape {
  public readonly Kind = 'numberShape';

  public visit<V extends Visitor>(visitor: V): ReturnType<V[this["Kind"]]> {
    return visitor.numberShape(this) as ReturnType<V['numberShape']>;
  }
}

export const string = new StringShape();
export const number = new NumberShape();

export const isStringShape = (a: any): a is StringShape => isShape(a) && a.Kind === 'stringShape';
export const isNumberShape = (a: any): a is NumberShape => isShape(a) && a.Kind === 'numberShape';