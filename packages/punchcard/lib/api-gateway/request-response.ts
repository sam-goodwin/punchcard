export type HttpMethod =
    'DELETE' |
    'HEAD' |
    'GET' |
    'PATCH' |
    'POST' |
    'PUT';

export interface ApiGatewayRequest {
    resource: string;
    path: string;
    httpMethod: HttpMethod;
    headers: { [key: string]: string },
    queryStringParameters: { [key: string]: string };
    pathParameters: { [key: string]: string };
    stageVariables: { [key: string]: string };
    requestContext: RequestContext;
    body?: string
    isBase64Encoded: boolean;
}

export interface RequestContext {
    accountId: string;
    resourceId: string;
    stage: string;
    requestId: string;
    identity: ApiRequestIdentity;
    resourcePath: string;
    httpMethod: string;
    apiId: string;
}

export interface ApiRequestIdentity {
    cognitoIdentityPoolId: string;
    accountId: string;
    cognitoIdentityId: string;
    caller: string;
    apiKey: string;
    sourceIp: string;
    cognitoAuthenticationType: string;
    cognitoAuthenticationProvider: string;
    userArn: string;
    userAgent: string;
    user: string;
}

export enum StatusCode {
  Ok = 200,
  NotFound = 404,
  InternalError = 500
}

// export type StatusCode =
//     '100' | '101' | '102' |

//     '200' | '201' | '202' | '203' | '204' | '205' | '206' | '207' | '208' | '226' |

//     '300' | '301' | '302' | '303' | '304' | '305' | '306' | '307' | '308' |

//     '400' | '401' | '402' | '403' | '404' | '405' | '406' | '407' | '408' | '409' | '410' |
//     '412' | '413' | '414' | '415' | '416' | '417' | '418' | '421' | '422' | '424' | '425' |
//     '426' | '428' | '429' | '431' | '451' |

//     '500' | '501' | '502' | '503' | '504' | '505' | '506' | '507' | '508' | '510' | '511';

export interface ApiGatewayResponse {
    statusCode: StatusCode;
    headers: { [key: string]: string };
    body: string;
    isBase64Encoded: boolean;
}
