import { Scope } from './scope';
import { Statement } from './statement';

export function Try(fn: (scope: Scope) => void, Catch?: CatchBlock) {

}

export enum Errors {
  ALL = 'States.ALL',
  Permissions = 'States.Permissions',
  Runtime = 'States.Runtime',
  TaskFailed = 'States.TaskFailed',
  Timeout = 'States.Timeout',
}

export function Catch(errorsName: string | string[], fn: (scope: Scope) => void, catchBlock?: CatchBlock): CatchBlock {
  return new CatchBlock();
}

export class CatchBlock {

}

export class TryCatch extends Statement {
  public kind: 'tryCatch' = 'tryCatch';

}