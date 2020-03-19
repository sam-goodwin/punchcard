import { bool, string } from '@punchcard/shape';
import { StatementF } from '../intepreter/statement';
import { GraphQL } from '../types';
import { $DynamoDBUtil as DynamoDBUtil } from './dynamodb';
import { $ListUtil as ListUtil } from './list';

export class Util {
  public validate(condition: GraphQL.Bool, message: GraphQL.String | string, errorType?: GraphQL.String | string): StatementF<GraphQL.Nothing> {
    return null as any;
  }

  public autoId(): GraphQL.String {
    return new GraphQL.String(string, new GraphQL.Expression('$util.autoId()'));
  }

  public matches(regex: RegExp | string): StatementF<GraphQL.Bool> {
    throw new Error('todo');
  }

  public isNull(value: GraphQL.Type): GraphQL.Bool {
    return new GraphQL.Bool(bool, new GraphQL.Expression((ctx) => {
      ctx.print(`$util.isNull(`);
      GraphQL.render(value, ctx);
      ctx.print(')');
    }));
  }

  public readonly dynamodb = new DynamoDBUtil();
  public readonly list = new ListUtil();
}
