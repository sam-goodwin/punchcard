import apigateway = require('@aws-cdk/aws-apigateway');
import cdk = require('@aws-cdk/core');

import { Resource } from './resource';

export interface ApiOptions extends apigateway.ResourceOptions, apigateway.RestApiProps {}

export class Api extends Resource {
  constructor(scope: cdk.Construct, id: string, options?: ApiOptions) {
    super(undefined as any, '/', options || {});
    const api = new apigateway.RestApi(scope, id, options);

    // naughty
    (this as any).restApiId = api.restApiId;
    (this as any).resource = api.root;
    (this as any).getRequestValidator = new apigateway.CfnRequestValidator(api, `GetRequestValidator`, {
      restApiId: this.restApiId,
      validateRequestParameters: true
    }).ref;
    (this as any).bodyRequestValidator = new apigateway.CfnRequestValidator(api, `BodyRequestValidator`, {
      restApiId: this.restApiId,
      validateRequestBody: true,
      validateRequestParameters: true
    }).ref;
  }
}
