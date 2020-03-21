export type HttpMethod = "DELETE" | "HEAD" | "GET" | "PATCH" | "POST" | "PUT";

export interface ApiGatewayRequest {
  body?: string;
  headers: {[key: string]: string};
  httpMethod: HttpMethod;
  isBase64Encoded: boolean;
  path: string;
  pathParameters: {[key: string]: string};
  queryStringParameters: {[key: string]: string};
  requestContext: RequestContext;
  resource: string;
  stageVariables: {[key: string]: string};
}

export interface RequestContext {
  accountId: string;
  apiId: string;
  httpMethod: string;
  identity: ApiRequestIdentity;
  requestId: string;
  resourceId: string;
  resourcePath: string;
  stage: string;
}

export interface ApiRequestIdentity {
  accountId: string;
  apiKey: string;
  caller: string;
  cognitoAuthenticationProvider: string;
  cognitoAuthenticationType: string;
  cognitoIdentityId: string;
  cognitoIdentityPoolId: string;
  sourceIp: string;
  user: string;
  userAgent: string;
  userArn: string;
}

export enum StatusCode {
  Ok = 200,
  NotFound = 404,
  Conflict = 409,
  InternalError = 500,
}

// export type StatusCode =
//   | "100"
//   | "101"
//   | "102"
//   | "200"
//   | "201"
//   | "202"
//   | "203"
//   | "204"
//   | "205"
//   | "206"
//   | "207"
//   | "208"
//   | "226"
//   | "300"
//   | "301"
//   | "302"
//   | "303"
//   | "304"
//   | "305"
//   | "306"
//   | "307"
//   | "308"
//   | "400"
//   | "401"
//   | "402"
//   | "403"
//   | "404"
//   | "405"
//   | "406"
//   | "407"
//   | "408"
//   | "409"
//   | "410"
//   | "412"
//   | "413"
//   | "414"
//   | "415"
//   | "416"
//   | "417"
//   | "418"
//   | "421"
//   | "422"
//   | "424"
//   | "425"
//   | "426"
//   | "428"
//   | "429"
//   | "431"
//   | "451"
//   | "500"
//   | "501"
//   | "502"
//   | "503"
//   | "504"
//   | "505"
//   | "506"
//   | "507"
//   | "508"
//   | "510"
//   | "511";

export interface ApiGatewayResponse {
  body: string;
  headers: {[key: string]: string};
  isBase64Encoded: boolean;
  statusCode: StatusCode;
}
