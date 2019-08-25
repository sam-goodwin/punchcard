import core = require('@aws-cdk/core');

export interface Resource<R extends core.Construct> {
  resource: R;
}