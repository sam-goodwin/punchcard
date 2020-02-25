import sfn = require('@aws-cdk/aws-stepfunctions');

import { Scope } from './scope';
import { Statement } from './statement';

export abstract class Task extends Statement {
  public readonly kind: 'task' = 'task';
  constructor(scope?: Scope) {
    super(scope);
  }

  public abstract next(state: sfn.IChainable): sfn.State;
}

export namespace Task {
  export const DSL = Symbol.for('punchcard/lib/step-functions.Task.DSL');
  export interface DSL<T = any> {
    [DSL](): T
  }

  export type GetDSL<T extends DSL> = ReturnType<T[typeof DSL]>;
}
