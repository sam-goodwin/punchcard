import { array, optional, Record, string } from '@punchcard/shape';
import { VExpression } from './expression';
import { VObject } from './vtl-object';

/**
 * @see https://docs.aws.amazon.com/appsync/latest/devguide/resolver-context-reference.html#aws-appsync-resolver-context-reference-identity
 */
export class Identity extends Record('appsync.Context.Identity', {
  sourceIp: array(string),
  userArn: optional(string),
  accountId: string,
  user: string
}) {}

export const $context = {
  identity: VObject.of(Identity, new VExpression('$context.identity'))
};