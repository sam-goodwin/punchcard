import type * as cognito from '@aws-cdk/aws-cognito';

import { any, AnyShape, RecordShape } from '@punchcard/shape';
import { Client } from '../../core';
import { Scope } from '../../core/construct';
import { Dependency } from '../../core/dependency';
import Lambda = require('../../lambda');
import { AuthenticationTriggers } from './authentication';
import { CustomAuthenticationTriggers } from './custom-authentication';
import { CustomMessageTriggers } from './custom-message';
import { SignUpTriggers } from './sign-up';
import { TriggerEvent } from './trigger-event';
import { TriggerRequest } from './trigger-request';
import { TriggerSource } from './trigger-source';

export type TriggerHandler<
  Source extends TriggerSource,
  Request extends TriggerRequest<A>,
  Response,
  A extends RecordShape,
  D extends Dependency<any>
> = (event: TriggerEvent<Request, Source>, client: Client<D>) => Promise<Response>;

/**
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html
 */
export interface TriggerHandlers<A extends RecordShape, D extends Dependency<any>> extends
  CustomAuthenticationTriggers<A, D>,
  AuthenticationTriggers<A, D>,
  SignUpTriggers<A, D>,
  CustomMessageTriggers<A, D> {}

export interface TriggerFunctionProps<D extends Dependency<any>> extends Omit<Lambda.FunctionProps<AnyShape, AnyShape, D>, 'request' | 'response'> {
}
export class TriggerFunction<A extends RecordShape, D extends Dependency<any>> extends Lambda.Function<AnyShape, AnyShape, D> {
  constructor(
    scope: Scope,
    id: string,
    props: TriggerFunctionProps<D>,
    public readonly attributes: A,
    public readonly handlers: TriggerHandlers<A, D>
  ) {
    super(scope, id, props, async (event: TriggerEvent, client: Client<D>) => {
      const handler = findHander(event);

      if (handler) {
        const response = await handler(event as any, client);
        // Cognito requires that the original request be returned with response embedded in the field, `response`
        return {
          ...event,
          response
        };
      } else {
        throw new Error(`unable to handle triggerSource: ${event.triggerSource}`);
      }
    });

    const cache: {
      [S in TriggerSource]?: TriggerHandler<S, TriggerRequest<A>, {}, A, D>;
    } = {};

    function findHander(event: TriggerEvent) {
      if (cache[event.triggerSource] === undefined) {
        cache[event.triggerSource] = resolve(event);
      }
      return cache[event.triggerSource];
    }

    function resolve(event: TriggerEvent): TriggerHandler<any, any, any, A, D> {
      // signup
      if (handlers.preSignUp && TriggerSource.isPreSignUp(event.triggerSource)) {
        return handlers.preSignUp;
      } else if (handlers.postConfirmation && TriggerSource.isPostConfirmation(event.triggerSource)) {
        return handlers.postConfirmation;
      } else if (handlers.userMigration && TriggerSource.isUserMigration(event.triggerSource)) {
        return handlers.userMigration;
      }

      // authentication
      if (handlers.preAuthentication && event.triggerSource === TriggerSource.Authentication.PreAuthentication) {
        return handlers.preAuthentication;
      } else if (handlers.postAuthentication && event.triggerSource === TriggerSource.Authentication.PostAuthentication) {
        return handlers.postAuthentication;
      } else if (handlers.preTokenGeneration && TriggerSource.isTokenGeneration(event.triggerSource)) {
        return handlers.preTokenGeneration;
      }

      // custom authentication
      if (handlers.createAuthChallenge && event.triggerSource === TriggerSource.CustomAuthentication.CreateAuthChallenge) {
        return handlers.createAuthChallenge;
      } else if (handlers.defineAuthChallenge && event.triggerSource === TriggerSource.CustomAuthentication.DefineAuthChallenge) {
        return handlers.defineAuthChallenge;
      } else if (handlers.verifyAuthChallengeResponse && event.triggerSource === TriggerSource.CustomAuthentication.VerifyAuthChallengeResponse) {
        return handlers.verifyAuthChallengeResponse;
      }

      throw new Error(`unknown trigger source: ${event.triggerSource}`);
    }
  }
}