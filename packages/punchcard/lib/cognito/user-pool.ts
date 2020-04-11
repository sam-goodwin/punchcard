import type * as cognito from '@aws-cdk/aws-cognito';

import { Meta, Shape, ShapeGuards, string, array} from '@punchcard/shape';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Construct, Scope } from '../core/construct';
import { Resource } from '../core/resource';

import { CustomAttributes } from './attributes';
import { StandardClaims } from './standard-claims';
import { TriggerFunction } from './triggers/trigger-function';

export interface UserPoolProps<T extends CustomAttributes = {}> {
  requiredAttributes?: {
    [k in keyof StandardClaims]?: boolean;
  };
  signInAliases?: cognito.SignInAliases;
  customAttributes?: T;
  passwordPolicy?: cognito.PasswordPolicy;
  buildProps?: Build<cognito.UserPoolProps>;
  /**
   * Each TriggerFunction implements one or more Cognito hooks.
   * 
   * If two functions declare an implementation for the same hook, then the first
   * one is selected.
   */
  triggers?: TriggerFunction<any>[];
}

export class UserPool<A extends CustomAttributes> extends Construct implements Resource<cognito.UserPool> {
  public readonly resource: Build<cognito.UserPool>;

  public readonly customAttributes: A | undefined;

  constructor(scope: Scope, id: string, props: UserPoolProps<A>) {
    super(scope, id);
    this.customAttributes = props.customAttributes;
    this.resource = CDK.chain(({ cognito }) => this.scope.map(scope => {
      return new cognito.UserPool(scope, this.id, {
        requiredAttributes: props.requiredAttributes,
        signInAliases: props.signInAliases,
        lambdaTriggers: lambdaTriggers(),
        customAttributes: customAttributes(),
      });

      function lambdaTriggers() {
        const triggers: Partial<cognito.UserPoolTriggers> = {};
        for (const fn of props.triggers || []) {
          for (const triggerName of Object.keys(fn.handlers) as (keyof cognito.UserPoolTriggers)[]) {
            if (triggers[triggerName] === undefined) {
              triggers[triggerName] = Build.resolve(fn.resource)
            } else {
              console.warn(`ignoring duplicate trigger: ${triggerName}`);
            }
          }
        }
        return triggers;
      }

      function customAttributes() {
        return Object.entries((props.customAttributes || {})).map(([name, value]) => ({
          [name]: shapeToAttribute(value as Shape)
        })).reduce((a, b) => ({ ...a, ...b }));
      }

      function shapeToAttribute(shape: Shape): cognito.ICustomAttribute {
        if (ShapeGuards.isStringShape(shape)) {
          const { maxLength, minLength } = Meta.get(shape, ['maxLength', 'minLength']);
          return new cognito.StringAttribute({
            maxLen: maxLength,
            minLen: minLength
          });
        } else if (ShapeGuards.isNumericShape(shape)) {
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
}
