import type * as cognito from '@aws-cdk/aws-cognito';

import { Meta, Optional, Shape, ShapeGuards, TypeClass, TypeShape } from '@punchcard/shape';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Construct, Scope } from '../core/construct';
import { Dependency } from '../core/dependency';
import { Resource } from '../core/resource';
import { CustomAttributes, RequiredAttributes } from './attributes';
import { AuthenticationTriggers } from './authentication';
import { CustomAuthenticationTriggers } from './custom-authentication';
import { CustomMessageTriggers } from './custom-message';
import { SignUpTriggers } from './sign-up';
import { StandardClaims } from './standard-claims';
import { TriggerFunction, TriggerFunctionProps, TriggerHandlers } from './trigger-function';

export interface UserPoolProps<R extends RequiredAttributes = {}, C extends CustomAttributes = {}> {
  buildProps?: Build<cognito.UserPoolProps>;
  passwordPolicy?: cognito.PasswordPolicy;
  signInAliases?: cognito.SignInAliases;
  standardAttributes?: R;
  customAttributes?: C;
}

export class UserPool<R extends RequiredAttributes, C extends CustomAttributes> extends Construct implements Resource<cognito.UserPool> {
  public readonly resource: Build<cognito.UserPool>;

  public readonly requiredAttributes: R;
  public readonly customAttributes: C;
  public readonly attributes: TypeShape<{
    [a in keyof StandardClaims]: R[a] extends true ? StandardClaims[a] : Optional<StandardClaims[a]>;
  } & {
    custom: Optional<TypeClass<C>>;
  }>;

  private readonly triggers: TriggerFunction<this['attributes'], Dependency<any>>[] = [];

  constructor(scope: Scope, id: string, props: UserPoolProps<R, C> = {}) {
    super(scope, id);
    this.requiredAttributes = (props.standardAttributes || {}) as R;
    this.customAttributes = (props.customAttributes || {}) as C;
    this.resource = CDK.chain(({ cognito }) => this.scope.map(scope => {
      const lambdaTriggers: Partial<cognito.UserPoolTriggers> = {};
      for (const fn of this.triggers || []) {
        for (const triggerName of Object.keys(fn.handlers) as (keyof cognito.UserPoolTriggers)[]) {
          if (lambdaTriggers[triggerName] === undefined) {
            lambdaTriggers[triggerName] = Build.resolve(fn.resource);
          } else {
            console.warn(`ignoring duplicate trigger: ${triggerName}`);
          }
        }
      }

      const customAttributes = Object.entries((props.customAttributes || {})).map(([name, value]) => ({
        [name]: shapeToAttribute(value as Shape)
      })).reduce((a, b) => ({ ...a, ...b }), {});

      return new cognito.UserPool(scope, this.id, {
        standardAttributes: props.standardAttributes,
        signInAliases: props.signInAliases,
        lambdaTriggers,
        customAttributes,
      });

      function shapeToAttribute(shape: Shape): cognito.ICustomAttribute {
        if (ShapeGuards.isStringShape(shape)) {
          const { maxLength, minLength } = Meta.get(shape, ['maxLength', 'minLength']);
          return new cognito.StringAttribute({
            maxLen: maxLength,
            minLen: minLength
          });
        } else if (ShapeGuards.isNumberShape(shape)) {
          const { maximum, minimum } = Meta.get(shape, ['maximum', 'minimum']);
          return new cognito.NumberAttribute({
            max: maximum,
            min: minimum
          });
        } else if (ShapeGuards.isBoolShape(shape)) {
          return new cognito.BooleanAttribute();
        } else if (ShapeGuards.isTimestampShape(shape)) {
          return new cognito.DateTimeAttribute();
        }
        throw new Error(`unsupported custom attribute type: ${shape}`);
      }
    }));
  }

  /**
   * Creates a new Lambda Function to handle Cognito Triggers.
   *
   * @param scope to create constructs udner
   * @param id id of this lambda function
   * @param props trigger function properties
   * @param handlers trigger handlers implemented by this lambda function
   */
  public onTrigger<D extends Dependency<any>>(
    scope: Scope,
    id: string,
    props: Omit<TriggerFunctionProps<D>, 'attributes'>,
    handlers: TriggerHandlers<this['attributes'], D>,
  ) {
    return new TriggerFunction(scope, id, props, this.attributes, handlers);
  }

  /**
   * Creates a new Lambda Function to handle authentication triggers.
   *
   * @param scope to create constructs udner
   * @param id id of this lambda function
   * @param props trigger function properties
   * @param handlers
   */
  public onAuthentication<D extends Dependency<any>>(
    scope: Scope,
    id: string,
    props: Omit<TriggerFunctionProps<D>, 'attributes'>,
    handlers: AuthenticationTriggers<this['attributes'], D>,
  ) {
    return this.onTrigger(scope,id, props, handlers);
  }
  public onCustomAuthentication<D extends Dependency<any>>(
    scope: Scope,
    id: string,
    props: Omit<TriggerFunctionProps<D>, 'attributes'>,
    handlers: CustomAuthenticationTriggers<this['attributes'], D>,
  ) {
    return this.onTrigger(scope,id, props, handlers);
  }
  public onSignUp<D extends Dependency<any>>(
    scope: Scope,
    id: string,
    props: Omit<TriggerFunctionProps<D>, 'attributes'>,
    handlers: SignUpTriggers<this['attributes'], D>,
  ) {
    return this.onTrigger(scope,id, props, handlers);
  }
  public onCustomMessage<D extends Dependency<any>>(
    scope: Scope,
    id: string,
    props: Omit<TriggerFunctionProps<D>, 'attributes'>,
    handlers: Required<CustomMessageTriggers<this['attributes'], D>>,
  ) {
    return this.onTrigger(scope,id, props, handlers);
  }
}
