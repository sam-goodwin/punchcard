import sfn = require('@aws-cdk/aws-stepfunctions');

import { Branch } from './choice';
import { WhileLoop } from './control';
import { Node } from './node';
import { Scope } from './scope';
import { Assign, State } from './state';
import { Task } from './task';
import { Try } from './try-catch';
import { Wait } from './wait';

export class Synthesizer implements Node.Visitor<sfn.INextable, sfn.INextable> {
  public assign<A extends Assign<any>>(assign: A, context: sfn.INextable): sfn.INextable {
    throw new Error("Method not implemented.");
  }
  public branch<B extends Branch>(branch: B, context: sfn.INextable): sfn.INextable {
    throw new Error("Method not implemented.");
  }
  public scope<S extends Scope>(scope: S, context: sfn.INextable): sfn.INextable {
    throw new Error("Method not implemented.");
  }
  public task<T extends Task>(task: T, context: sfn.INextable): T {
    throw new Error("Method not implemented.");
  }
  public try<T extends Try>(tryCatch: T, context: sfn.INextable): T {
    throw new Error("Method not implemented.");
  }
  public wait<W extends Wait>(wait: W, context: sfn.INextable): sfn.INextable {
    throw new Error("Method not implemented.");
  }
  public whileLoop<W extends WhileLoop>(whileLoop: W, context: sfn.INextable): sfn.INextable {
    throw new Error("Method not implemented.");
  }
}
