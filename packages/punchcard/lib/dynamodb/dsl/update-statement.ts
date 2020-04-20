import { Shape } from '@punchcard/shape';
import { IfBranch, VString } from '../../appsync';
import { AddExpressionName, AddExpressionValue } from './filter-expression';

/**
 * An update transaction against an item.
 */
export type UpdateTransaction<T> = Generator<UpdateStatement<Shape>, T>;

export type UpdateStatement<T extends Shape = Shape> =
  | AddExpressionValue<T>
  | AddExpressionName
  | AddSetAction
  | IfBranch<T, UpdateStatement>
;

export function isAddSetAction(a: any): a is AddSetAction {
  return a.tag === AddSetAction.TAG;
}
export function *addSetAction(action: string | VString): UpdateTransaction<string> {
  return (yield new AddSetAction(action)) as any;
}
export class AddSetAction {
  public static readonly TAG = 'add-set-action';
  public readonly tag = AddSetAction.TAG;
  constructor(
    public readonly action: string | VString
  ) {}
}