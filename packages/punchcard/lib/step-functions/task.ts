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