import { array, optional, Record, string, map } from '@punchcard/shape';
import { VExpression } from './expression';
import { VObject, VString, VList } from './vtl-object';

import './vtl';
import { StandardClaims } from '../cognito/standard-claims';

/**
 * An object that contains information about the caller.
 *
 * @see https://docs.aws.amazon.com/appsync/latest/devguide/resolver-context-reference.html#aws-appsync-resolver-context-reference-identity
 */
export class Identity extends Record({
  /**
   * The AWS account ID of the caller.
   */
  accountId: optional(string),
  /**
   * Either `authenticated` or `unauthenticated` based on the identity type.
   */
  cognitoIdentityAuthProvider: optional(string),
  /**
   * The external identity provider that was used to obtain the credentials used to sign the request.
   */
  cognitoIdentityAuthType: optional(string),
  /**
   * The Amazon Cognito identity ID of the caller.
   */
  cognitoIdentityId: optional(string),
  /**
   * The Amazon Cognito identity pool ID associated with the caller.
   */
  cognitoIdentityPoolId: optional(string),
  /**
   * The default authorization strategy for this caller (ALLOW or DENY).
   */
  defaultAuthStrategy: optional(string),
  /**
   * The token issuer.
   */
  issuer: optional(string),
  /**
   * The source IP address of the caller received by AWS AppSync. If the request
   * doesn’t include the x-forwarded-for header, the source IP value contains only
   * a single IP address from the TCP connection. If the request includes a
   * `x-forwarded-for` header, the source IP is a list of IP addresses from the
   * `x-forwarded-for` header, in addition to the IP address from the TCP connection.
   */
  sourceIp : array(string),
  /**
   * The UUID of the authenticated user.
   */
  sub : optional(string),
  /**
   * The IAM user.
   */
  user: string,
  /**
   * The ARN of the IAM user.
   */
  userArn: optional(string),
  /**
   * The user name of the authenticated user. In the case of `AMAZON_COGNITO_USER_POOLS`
   * authorization, the value of username is the value of attribute cognito:username. In
   * the case of `AWS_IAM` authorization, the value of username is the value of the AWS
   * user principal. We recommend that you use `cognitoIdentityId` if you’re using AWS IAM
   * authorization with credentials vended from Amazon Cognito identity pools.
   */
  username: string, 
}) {}

export namespace $context {
  export interface Identity {
    claims: Claims;
  }

  export type Claims = {
    'cognito:groups': VList<VString>;
    'cognito:username': VString;
  } & {
    [k in keyof typeof StandardClaims]: VObject.Of<(typeof StandardClaims)[k]>
  } & {
    [key in string]?: VString;
  };

  export const identity: VObject.Of<typeof Identity> & {claims: Claims} = VObject.of(Identity, new VExpression('$context.identity')) as any;
  (identity as any).claims = {
    'cognito:groups': VObject.of(array(string), new VExpression('$context.identity.claims.get("cognito:groups")')),
    'cognito:username': VObject.of(string, new VExpression('$context.identity.claims.get("cognito:username")')),
    ...(Object.entries(StandardClaims)
      .map(([name, shape]) => ({[name]: VObject.of(shape, new VExpression(`$context.identity.claims.get("${name}")`))}))
      .reduce((a, b) => ({...a, ...b})))
  } as Claims
}
