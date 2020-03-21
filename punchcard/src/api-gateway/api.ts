import * as apigateway from "@aws-cdk/aws-apigateway";
import * as cdk from "@aws-cdk/core";
import {Build} from "../core/build";
import {CDK} from "../core/cdk";
import {Resource} from "./resource";

export interface ApiOptions
  extends apigateway.ResourceOptions,
    apigateway.RestApiProps {}

export class Api extends Resource {
  public readonly api: Build<apigateway.RestApi>;

  constructor(scope: Build<cdk.Construct>, id: string, options?: ApiOptions) {
    super(undefined as any, "/", options || {});
    const api = CDK.chain(({apigateway}) =>
      scope.map((scope) => new apigateway.RestApi(scope, id, options)),
    );
    (this as any).restApiId = api.map((a) => a.restApiId);
    (this as any).getRequestValidator = CDK.chain(({apigateway}) =>
      api.map(
        (api) =>
          new apigateway.CfnRequestValidator(api, `GetRequestValidator`, {
            restApiId: api.restApiId,
            validateRequestParameters: true,
          }).ref,
      ),
    );
    (this as any).bodyRequestValidator = CDK.chain(({apigateway}) =>
      api.map(
        (api) =>
          new apigateway.CfnRequestValidator(api, `BodyRequestValidator`, {
            restApiId: api.restApiId,
            validateRequestBody: true,
            validateRequestParameters: true,
          }).ref,
      ),
    );
    this.api = api.chain((api) =>
      this.getRequestValidator.chain((_) =>
        this.bodyRequestValidator.map((_) => api),
      ),
    );
    (this as any).resource = this.api.map((api) => api.root);
  }
}
