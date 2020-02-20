import sfn = require('@aws-cdk/aws-stepfunctions');
import cdk = require('@aws-cdk/core');

import { Branch } from './choice';
import { WhileLoop } from './control';
import { Node } from './node';
import { Scope } from './scope';
import { Task } from './task';
import { TryCatch } from './try-catch';
import { Assign, Variable } from './variable';

export class Synthesizer implements Node.Visitor<sfn.INextable, sfn.INextable> {
  constructor(private readonly _scope: cdk.Construct) {

  }

  public assign<A extends Assign<any>>(assign: A, callback: sfn.INextable): any {
    throw new Error('Method not implemented.');
  }
  public branch<B extends Branch>(branch: B, from: sfn.INextable): sfn.INextable {
    const choice = new sfn.Choice(this._scope, branch.globalId);

    const iterate = (branch: Branch) => {
      choice.when(branch.condition.toCondition(), branch.scope.visit(this, from));
    };

    return choice;
  }
  public scope<S extends Scope>(scope: S, from: sfn.INextable): any {
    for (const statement of scope.statements) {
      from = statement.visit(this, from);
    }
  }
  public task<T extends Task>(task: T, from: sfn.INextable): any {
    throw new Error('Method not implemented.');
  }
  public tryCatch<T extends TryCatch>(tryCatch: T, from: sfn.INextable): any {
    throw new Error('Method not implemented.');
  }
  public variable<V extends Variable<any>>(variable: V, from: sfn.INextable): any {
    throw new Error('Method not implemented.');
  }
  public whileLoop<W extends WhileLoop>(whileLoop: W, from: sfn.INextable): any {
    throw new Error('Method not implemented.');
  }
}
