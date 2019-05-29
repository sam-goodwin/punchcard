import cdk = require('@aws-cdk/cdk');

export interface Resource<R extends cdk.Construct> {
  resource: R;
}