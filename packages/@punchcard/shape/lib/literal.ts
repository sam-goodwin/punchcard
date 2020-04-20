import { Shape } from './shape';
import { Value } from './value';

import './infer';

export function literal<V>(value: V): LiteralShape<Shape.Infer<V>, V>;
export function literal<T extends Shape, V extends Value.Of<T>>(type: T, value: V): LiteralShape<T, V>;
export function literal(a: any, b?: any) {
  if (typeof b === undefined) {
    return new LiteralShape(Shape.infer(a), a);
  }
  return new LiteralShape(a, b);
}

export class LiteralShape<T extends Shape, V = any> extends Shape {
  public readonly FQN = 'literal';
  public readonly Kind: 'literalShape' = 'literalShape';
  constructor(
    public readonly Type: T,
    public readonly Value: V
  ) {
    super();
  }
}
