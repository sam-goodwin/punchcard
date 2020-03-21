import appsync = require('@aws-cdk/aws-appsync');
import cdk = require('@aws-cdk/core');
import { identity } from 'fp-ts/lib/Identity';
import { GraphQL } from '../graphql';
import { Statement, StatementGuards, Statements } from './statement';

import { Resolved } from './resolver';

import { Shape } from '@punchcard/shape';
import { foldFree } from 'fp-ts-contrib/lib/Free';
import { Frame } from './frame';

export interface CompiledResolver {
  arguments: {
    [argumentName: string]: Shape.Like
  },
  beforeTemplate: string;
  stages: {
    requestTemplate: string;
    responseTemplate: string;
    dataSource: any;
  }[]
  afterTemplate: string;
}

export function interpretResolver(resolved: Resolved<any>, interpeters: Interpreter<any>[] = []) {
  const compiledProgram: Partial<CompiledResolver> = {};

  const root = new Frame();
  const frame = root;

  foldFree(identity)((stmt => {
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

      return GraphQL.clone(stmt.value, new GraphQL.Expression(() => `$ctx.stash.${name}`));
    } else {
      throw new Error(`unknown statement type: ${stmt._tag}`);
    }
    return null as any;
  }), resolved.program);
}


export interface Interpreter<T extends Statement = Statement> {
  interpret<Stmt extends T>(statement: Stmt, ctx: Frame): GraphQL.Type;
}

class SetInterpreter implements Interpreter<Statements.Set> {
  public interpret<Stmt extends Statements.Set>(statement: Stmt, currentFrame: Frame): GraphQL.Type {
  }
}

class CallInterpreter implements Interpreter<Statements.Call> {
  public interpret<Stmt extends Statements.Call<GraphQL.Type>>(statement: Stmt, frame: Frame): GraphQL.Type {
    throw new Error("Method not implemented.");
  }
}