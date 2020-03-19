import appsync = require('@aws-cdk/aws-appsync');
import cdk = require('@aws-cdk/core');
import { identity } from 'fp-ts/lib/Identity';
import { Build } from '../../core/build';
import { GraphQL } from '../types';
import { Statement, Statements } from './statement';

import { Resolved } from './resolver';

import { foldFree } from 'fp-ts-contrib/lib/Free';
import { Frame } from './frame';

export function interpret(resolved: Resolved<any>, interpeters: Interpreter<any>[] = []) {
  interpeters = [...interpeters].concat([
    new StashInterpreter(),
    new CallInterpreter()
  ] as any);

  // foldFree(resolved.program, )

}

export interface Interpreter<T extends Statement = Statement> {
  is(a: Statement): a is T;
  interpret<Stmt extends T>(statement: Stmt, ctx: Frame): GraphQL.Type;
}

class StashInterpreter implements Interpreter<Statements.Stash> {
  public readonly is = Statements.isStash;

  public interpret<Stmt extends Statements.Stash>(statement: Stmt, frame: Frame): GraphQL.Type {
    const name = statement.id || frame.getNewId();

    frame.declare(`$util.qr($ctx.stash.put("${name}",`);
    statement.value[GraphQL.expr].visit(frame);
    frame.declare(`))`);

    return GraphQL.clone(statement.value, new GraphQL.Expression(() => `$ctx.stash.${name}`));
  }
}

class CallInterpreter implements Interpreter<Statements.Call> {
  public readonly is = Statements.isCall;

  interpret<Stmt extends Statements.Call<GraphQL.Type>>(statement: Stmt, frame: Frame): GraphQL.Type {
    throw new Error("Method not implemented.");
  }
}