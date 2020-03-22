import * as cdk from "@aws-cdk/core";

import {Build} from "./build";

export interface Resource<R> {
  resource: Build<R>;
}

export namespace Resource {
  export type Bind<T> = (scope: Build<cdk.Construct>, id: string) => Build<T>;
}
