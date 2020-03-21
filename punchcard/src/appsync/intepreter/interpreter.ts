import {Statement, StatementGuards, Statements} from "./statement";
import {Frame} from "./frame";
import {GraphQL} from "../graphql";
import {Resolved} from "./resolver";
import {Shape} from "@punchcard/shape";
import {foldFree} from "fp-ts-contrib/lib/Free";
import {identity} from "fp-ts/lib/Identity";

export interface CompiledResolver {
  afterTemplate: string;
  arguments: {
    [argumentName: string]: Shape.Like;
  };
  beforeTemplate: string;
  stages: {
    dataSource: any;
    requestTemplate: string;
    responseTemplate: string;
  }[];
}

export function interpretResolver(
  resolved: Resolved<any>,
  _interpeters: Interpreter<any>[] = [],
): void {
  // const compiledProgram: Partial<CompiledResolver> = {};

  const root = new Frame();
  const frame = root;

  foldFree(identity)((stmt) => {
    if (StatementGuards.isCall(stmt)) {
      /**
       * TODO: Print to the output and make a request to a data source.
       */
    } else if (StatementGuards.isSet(stmt)) {
      /**
       * Compute a value and store it in the stash.
       */
      const name = stmt.id || frame.getNewId();

      frame.variables.print(`$util.qr($ctx.stash.put("${name}",`);
      frame.variables.interpret(stmt.value);
      frame.variables.print(`))`);

      return GraphQL.clone(
        stmt.value,
        new GraphQL.Expression(() => `$ctx.stash.${name}`),
      );
    } else {
      throw new TypeError(`unknown statement type: ${stmt._tag}`);
    }
    return undefined as any;
  }, resolved.program);
}

export interface Interpreter<T extends Statement = Statement> {
  interpret<Stmt extends T>(statement: Stmt, ctx: Frame): GraphQL.Type;
}

// @ts-ignore
class SetInterpreter implements Interpreter<Statements.Set> {
  // @ts-ignore
  public interpret<Stmt extends Statements.Set>(
    _statement: Stmt,
    _currentFrame: Frame,
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ): GraphQL.Type {}
}

// @ts-ignore
class CallInterpreter implements Interpreter<Statements.Call> {
  public interpret<Stmt extends Statements.Call<GraphQL.Type>>(
    _statement: Stmt,
    _frame: Frame,
  ): GraphQL.Type {
    throw new Error("Method not implemented.");
  }
}
