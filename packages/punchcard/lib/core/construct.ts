import type * as cdk from '@aws-cdk/core';

import { Build } from './build';

export class Construct {
  public readonly scope: Build<cdk.Construct>;
  constructor(scope: Scope, public readonly id: string) {
    this.scope = Scope.resolve(scope);
  }
}
export namespace Construct {
  export type Class<C extends Construct = Construct, Props = undefined> = new(scope: Scope, id: string, props?: Props) => C;
}

export type Scope = Construct | Build<cdk.Construct>;

export namespace Scope {
  export function resolve<S extends Scope>(scope: S): Build<cdk.Construct> {
    if (Build.isBuild(scope)) {
      return scope as any as Build<cdk.Construct>;
    } else {
      return (scope as Construct).scope;
    }
  }
}