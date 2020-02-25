import cdk = require('@aws-cdk/core');

import { Scope } from './scope';
import { Statement } from './statement';

export function $wait(duration: number, unit: 'seconds' | 'minutes' = 'seconds', scope?: Scope): Wait {
  return new Wait(unit === 'seconds' ? cdk.Duration.seconds(duration) : cdk.Duration.minutes(duration), scope);
}

export class Wait extends Statement {
  public kind: 'wait' = 'wait';

  constructor(public readonly duration: cdk.Duration, scope?: Scope) {
    super(scope);
  }
}