import { $context } from '../lang/context';
import { directive } from '../lang/statement';
import { $else, $elseIf, $if } from './syntax';
import { $util } from './util/util';
import { VTL } from './vtl';
import { VNothing, VString } from './vtl-object';

export namespace $auth {
  export enum Mode {
    AMAZON_COGNITO_USER_POOLS = 'AMAZON_COGNITO_USER_POOLS',
    AWS_IAM = 'AWS_IAM',
    NONE = 'NONE',
    OPENID_CONNECT = 'OPENID_CONNECT',
  }

  /**
   * @see https://docs.aws.amazon.com/appsync/latest/devguide/security.html#using-additional-authorization-modes
   */
  export type AllowProps = {
    aws_cognito_user_pools: true | {
      groups: string[];
    };
  } | {
    aws_iam: true;
  } | {
    aws_api_key: true;
  } | {
    aws_oidc: true;
  };

  export function *allow(props: AllowProps): VTL<VNothing> {
    return yield* directive(...Object.entries(props).map(([name, value]) => {
      if (value === true) {
        return `@${name}`;
      } else {
        return `@${name}(cognito_groups: ["${value.groups.join('","')}"])`;
      }
    }));
  }

  export function *mode(): VTL<VString> {
    return yield* $if($util.isNull($context.identity), function*() {
      return yield* $if($context.identity.cognitoIdentityPoolId.isNotEmpty(), () =>
        VTL.string(Mode.AMAZON_COGNITO_USER_POOLS)
      , $elseIf($context.identity.accountId.isNotEmpty(), () =>
        VTL.string(Mode.AWS_IAM)
      , $else(() =>
        VTL.string(Mode.NONE)
      )));
    }, $else(() => VTL.string(Mode.NONE)));
  }
}

