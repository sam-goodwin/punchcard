import { Scope } from './scope';
import { Statement } from './statement';

export function $try(fn: (scope: Scope) => void): Try {
  return new Try();
}

export class Try extends Statement {
  public kind: 'try' = 'try';

  public $catch(errorsName: string | string[], fn: (scope: Scope) => void): Catch {
    return new Catch(errorsName, fn, this);
  }
}

export class Catch {
  constructor(
    public readonly errorsName: string | string[],
    public readonly scope: Scope,
    public readonly parent: Try | Catch) {}

  public $catch(errorsName: string | string[], fn: (scope: Scope) => void): Catch {
    return new Catch(errorsName, fn, this);
  }

  public $finally(fn: (scope: Scope) => void): Finally {
    
    return new Finally(, this)
  }
}

export class Finally {
  constructor(public readonly scope: Scope, public readonly parent: Try | Catch) {}
}


export enum Errors {
  ALL = 'States.ALL',
  Permissions = 'States.Permissions',
  Runtime = 'States.Runtime',
  TaskFailed = 'States.TaskFailed',
  Timeout = 'States.Timeout',
}
