import { Shape } from '@punchcard/shape';
import { Expression } from './expression';
import { Object } from './object';
import { NodeType } from './symbols';

/**
 * An expression yielded by a function call.
 */
export class FunctionCall<Args extends Object[] = any, Result extends Shape = any> extends Expression<Result> {
  public readonly [NodeType]: 'functionCall';

  constructor(
      public readonly target: Object,
      public readonly name: string,
      public readonly args: Args,
      public readonly result: Result) {
    super(result);
  }
}