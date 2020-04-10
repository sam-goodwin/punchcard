import type * as cognito from '@aws-cdk/aws-cognito';

import { AnyShape } from '@punchcard/shape';
import { Client } from '../core';
import { Scope } from '../core/construct';
import { Dependency } from '../core/dependency';
import Lambda = require('../lambda');
import { LambdaTriggerEvent, PreSignUpEvent, PreSignUpResponse } from './trigger-event';
import { TriggerSource } from './trigger-source';
import { UserPool } from './user-pool';

export type LambdaTriggerHandler<E extends LambdaTriggerEvent, Response, D extends Dependency<any>> =
  (event: E, client: Client<D>) => Promise<Response>;

export interface LambdaTriggerHandlers<D extends Dependency<any>> {
  preSignUp?: LambdaTriggerHandler<PreSignUpEvent, PreSignUpResponse, D>;
}

export interface LambdaTriggerFunctionProps<D extends Dependency<any>> extends Omit<Lambda.FunctionProps<AnyShape, AnyShape, D>, 'request' | 'response'> {
  triggers: LambdaTriggerHandlers<D>;
}
export class LambdaTriggerFunction<D extends Dependency<any>> extends Lambda.Function<AnyShape, AnyShape, D> {
  public readonly triggers: LambdaTriggerHandlers<D>;

  constructor(scope: Scope, id: string, props: LambdaTriggerFunctionProps<D>) {
    super(scope, id, props, async (event: LambdaTriggerEvent, client: Client<D>) => {
      if (event.triggerSource === TriggerSource.Authentication.PreSignUp_SignUp && this.triggers.preSignUp) {
        return this.triggers.preSignUp(event as PreSignUpEvent, client);
      }
      throw new Error(`unable to handle triggerSource: ${event.triggerSource}`);
    });
  }
}
