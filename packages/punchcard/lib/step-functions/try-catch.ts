import { Scope } from './scope';
import { Statement } from './statement';
import { Thing } from './thing';

export function $fail(error: any) {

}

export function $try<T extends void | Thing = void>(fn: (scope: Scope) => Generator<any, T, any>, catchBlock: Catch<T>): Generator<any, T, any> {
  return Scope.block(scope => new Try(fn(scope), scope));
}

export function $catch<T extends void | Thing>(errorName: string | string[], fn: (scope: Scope) => Generator<any, T, any>, catchBlock?: Catch<T> | Finally): Catch<T> {
  return null as any;
}

export function $finally<T>(fn: (scope: Scope) => void): Finally {
  return Scope.block(scope => new Finally(scope));
}

export class Try<T = any> extends Statement {
  public kind: 'try' = 'try';

  constructor(public readonly value: T, scope: Scope) {
    super(scope);
  }

  public $catch(errorsName: string | string[], fn: (scope: Scope) => T): Catch<T> {
    return Scope.block(scope => new Catch(errorsName, scope, this, fn(scope)));
  }
}

export class Catch<T = any> {
  constructor(
    public readonly errorsName: string | string[],
    public readonly scope: Scope,
    public readonly parent: Try<T> | Catch<T>,
    public readonly result: T,
    ) {}

  public $catch(errorsName: string | string[], fn: (scope: Scope) => T): Catch<T> {
    return Scope.block(scope => new Catch(errorsName, scope, this, fn(scope)));
  }

  public $finally(fn: (scope: Scope) => void): Finally {
    return Scope.block(scope => new Finally(scope));
  }
}

export class Finally {
  constructor(public readonly scope: Scope) {}
}

export enum Errors {
  ALL = 'States.ALL',
  Permissions = 'States.Permissions',
  Runtime = 'States.Runtime',
  TaskFailed = 'States.TaskFailed',
  Timeout = 'States.Timeout',
}
