import type * as cognito from '@aws-cdk/aws-cognito';

import { BoolShape, IntegerShape, Meta, NumberShape, Shape, ShapeGuards, Static, string, StringShape, TimestampShape, Trait } from '@punchcard/shape';
import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Construct, Scope } from '../core/construct';
import { Resource } from '../core/resource';

import { BooleanAttribute, DateTimeAttribute, NumberAttribute, StringAttribute } from '@aws-cdk/aws-cognito';
import { CustomAttributes } from './attributes';
import { StandardClaims } from './standard-claims';

export interface UserPoolProps<T extends CustomAttributes = {}> {
  requiredAttributes?: {
    [k in keyof StandardClaims]?: boolean;
  };
  signInAliases?: cognito.SignInAliases;
  customAttributes?: T;
  passwordPolicy?: cognito.PasswordPolicy;
  buildProps?: Build<cognito.UserPoolProps>;
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
        customAttributes: Object.entries((props.customAttributes || {})).map(([name, value]) => ({
          [name]: shapeToAttribute(value as Shape)
        })).reduce((a, b) => ({ ...a, ...b })),

        lambdaTriggers: {},
      });

      function shapeToAttribute(shape: Shape): cognito.ICustomAttribute {
        if (ShapeGuards.isStringShape(shape)) {
          const { maxLength, minLength } = Meta.get(shape, ['maxLength', 'minLength']);
          return new StringAttribute({
            maxLen: maxLength,
            minLen: minLength
          });
        } else if (ShapeGuards.isNumericShape(shape)) {
          const { maximum, minimum } = Meta.get(shape, ['maximum', 'minimum']);
          return new NumberAttribute({
            max: maximum,
            min: minimum
          });
        } else if (ShapeGuards.isBoolShape(shape)) {
          return new BooleanAttribute();
        } else if (ShapeGuards.isTimestampShape(shape)) {
          return new DateTimeAttribute();
        }
        throw new Error(`unsupported custom attribute type: ${shape}`);
      }
    }));
  }
}

const pool = new UserPool(null as any, '', {
  requiredAttributes: {
    middle_name: true
  },
  signInAliases: {
    email: true
  },
  customAttributes: {
    /**
     * Custom Key Attribute.
     */
    key: string
  },
});
