import { ShapeOrRecord, Value } from '@punchcard/shape';
import { Expression } from './expression';
import { NodeType } from './symbols';

/**
 * An literal value expression, e.g. `"string"`, or a number `1`.
 */
export class Literal<T extends ShapeOrRecord = any> extends Expression<T> {
  public readonly [NodeType]: 'literal' = 'literal';

  constructor(type: T, public readonly value: Value.Of<T>) {
    super(type);
  }
}