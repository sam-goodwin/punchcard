import { array, optional, Record, string } from "@punchcard/shape";

/**
 * @see https://docs.aws.amazon.com/appsync/latest/devguide/resolver-context-reference.html#aws-appsync-resolver-context-reference-identity
 */
export class Identity extends Record({
  sourceIp: array(string),
  userArn: optional(string),
  accountId: string,
  user: string
}) {}