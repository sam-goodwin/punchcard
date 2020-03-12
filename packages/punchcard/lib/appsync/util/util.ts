import { GraphQL } from '../types';
import { $DynamoDBUtil as DynamoDBUtil } from './dynamodb';
import { $ListUtil as ListUtil } from './list';

export class Util {
  public validate(condition: GraphQL.Bool, message: GraphQL.String, errorType?: GraphQL.String): GraphQL<void> {
    return null as any;
  }

  public autoId(): GraphQL<GraphQL.String> {
    throw new Error('todo');
  }

  public matches(regex: RegExp | string): GraphQL<GraphQL.Bool> {
    throw new Error('todo');
  }

  public readonly dynamodb = new DynamoDBUtil();
  public readonly list = new ListUtil();
}

/**
 * https://docs.aws.amazon.com/appsync/latest/devguide/resolver-util-reference.html
 */
export const $util = new Util();

export function $return<T extends GraphQL.Type = GraphQL.Nothing>(value?: T): GraphQL<never> {
  throw new Error('todo');
}