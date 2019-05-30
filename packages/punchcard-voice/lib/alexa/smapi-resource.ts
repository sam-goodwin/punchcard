import cfn = require('@aws-cdk/aws-cloudformation');
import cdk = require('@aws-cdk/cdk');
import { L, string } from 'punchcard';

export class Smapi extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    L().spawn(this, 'SmapiHandler', {
      request: string(),
      response: string()
    });

    const resource = new cfn.CustomResource(this, 'Resource', {

    });
  }
}