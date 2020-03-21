import * as cdk from "@aws-cdk/core";

import {Build} from "./build";

export interface Resource<R> {
  resource: Build<R>;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Resource {
  export type Bind<T> = (scope: Build<cdk.Construct>, id: string) => Build<T>;
}
