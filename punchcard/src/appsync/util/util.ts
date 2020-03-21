import {bool, string} from "@punchcard/shape";
import {$DynamoDBUtil as DynamoDBUtil} from "./dynamodb";
import {GraphQL} from "../graphql";
import {$ListUtil as ListUtil} from "./list";
import {StatementF} from "../intepreter/statement";

export class Util {
  public readonly dynamodb = new DynamoDBUtil();
  public readonly list = new ListUtil();
  // @ts-ignore
  public validate(
    _condition: GraphQL.Bool,
    _message: GraphQL.String | string,
    _errorType?: GraphQL.String | string,
  ): StatementF<GraphQL.Nothing> {
    // stop this madness as well!
    return undefined as any;
  }

  public autoId(): GraphQL.String {
    return new GraphQL.String(string, new GraphQL.Expression("$util.autoId()"));
  }

  public matches(_regex: RegExp | string): StatementF<GraphQL.Bool> {
    throw new Error("todo");
  }

  public isNull(value: GraphQL.Type): GraphQL.Bool {
    return new GraphQL.Bool(
      bool,
      new GraphQL.Expression((frame) => {
        frame.print(`$util.isNull(`);
        value[GraphQL.expr].visit(frame);
        frame.print(")");
      }),
    );
  }
}
