import {Record, array, optional, string} from "@punchcard/shape";

/**
 * @see https://docs.aws.amazon.com/appsync/latest/devguide/resolver-context-reference.html#aws-appsync-resolver-context-reference-identity
 */
export class Identity extends Record({
  accountId: string,
  sourceIp: array(string),
  user: string,
  userArn: optional(string),
}) {}
