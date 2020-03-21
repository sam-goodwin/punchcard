import * as cdk from "@aws-cdk/core";

import {Build} from "./build";

export class Construct {
  public readonly scope: Build<cdk.Construct>;
  constructor(scope: Scope, public readonly id: string) {
    this.scope = Scope.resolve(scope);
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Construct {
  export type Class<C extends Construct = Construct, Props = undefined> = new (
    scope: Scope,
    id: string,
    props?: Props,
  ) => C;
}

export type Scope = Construct | Build<cdk.Construct>;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Scope {
  // eslint-disable-next-line no-inner-declarations
  export function resolve<S extends Scope>(scope: S): Build<cdk.Construct> {
    if (Build.isBuild(scope)) {
      return scope;
    } else {
      return (scope as Construct).scope;
    }
  }
}
