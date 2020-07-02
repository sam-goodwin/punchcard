export enum AuthMode {
  AMAZON_COGNITO_USER_POOLS = 'AMAZON_COGNITO_USER_POOLS',
  AWS_IAM = 'AWS_IAM',
  NONE = 'NONE',
  OPENID_CONNECT = 'OPENID_CONNECT',
}

/**
 * @see https://docs.aws.amazon.com/appsync/latest/devguide/security.html#using-additional-authorization-modes
 */
export interface AuthMetadata {
  readonly auth?: AuthProps,
}

export type AuthProps = {
  aws_cognito_user_pools: true | {
    groups: string[];
  };
} | {
  aws_iam: true;
} | {
  aws_api_key: true;
} | {
  aws_oidc: true;
};