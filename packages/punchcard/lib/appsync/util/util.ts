import { NothingShape } from '@punchcard/shape';
import { directive } from '../resolver/directive';
import { StatementF } from '../resolver/resolver';
import { GraphQL } from '../types';
import { $DynamoDBUtil as DynamoDBUtil } from './dynamodb';
import { $ListUtil as ListUtil } from './list';

export class Util {
  public validate(condition: GraphQL.Bool, message: GraphQL.String, errorType?: GraphQL.String): StatementF<NothingShape> {
    return null as any;
  }

  public autoId(): StatementF<GraphQL.String> {
    return directive('$util.autoId()');
  }

  public matches(regex: RegExp | string): StatementF<GraphQL.Bool> {
    throw new Error('todo');
  }

  public readonly dynamodb = new DynamoDBUtil();
  public readonly list = new ListUtil();
}

/**
 * https://docs.aws.amazon.com/appsync/latest/devguide/resolver-util-reference.html
 */
export const $util = new Util();
