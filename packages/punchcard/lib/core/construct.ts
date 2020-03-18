import type * as cdk from '@aws-cdk/core';

import { Build } from './build';

export class Construct {
  public readonly scope: Build<cdk.Construct>;
  constructor(scope: Scope) {
    this.scope = Scope.resolve(scope);
  }
}

export type Scope = Construct | Build<cdk.Construct>;

export namespace Scope {
  export function resolve<S extends Scope>(scope: S): Build<cdk.Construct> {
    if (Build.isBuild(scope)) {
      return scope;
    } else {
      return (scope as Construct).scope;
    }
  }
}