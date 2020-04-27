import { Shape } from '@punchcard/shape';
import { IfBranch } from '../../appsync';
import { AddExpressionName, AddExpressionValue } from './expression-values';

/**
 * An update transaction against an item.
 */
export type ConditionExpression<T> = Generator<ConditionStatement<Shape>, T>;

export type ConditionStatement<T extends Shape = Shape> =
  | AddExpressionValue<T>
  | AddExpressionName
  | IfBranch<T, ConditionStatement>
;
