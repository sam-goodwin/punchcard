import { string } from '@punchcard/shape';
import { AuthMode, AuthProps } from '../api/auth';
import { $context } from '../lang/context';
import { $else, $elseIf, $if } from './syntax';
import { $util } from './util';
import { VTL } from './vtl';
import { VBool, VString } from './vtl-object';

export function toAuthDirectives(props: AuthProps) {
  return Object.entries(props).map(([name, value]) => {
    if (value === true) {
      return `@${name}`;
    } else {
      return `@${name}(cognito_groups: ["${value.groups.join('","')}"])`;
    }
  });
}

export namespace $auth {
  export function *mode(): VTL<VString> {
    return yield* $if($util.isNull($context.identity), function*() {
      return yield* $if(VBool.not($context.identity.cognitoIdentityPoolId.as(string).isEmpty()), () =>
        VTL.string(AuthMode.AMAZON_COGNITO_USER_POOLS)
      , $elseIf(VBool.not($context.identity.accountId.as(string).isEmpty()), () =>
        VTL.string(AuthMode.AWS_IAM)
      , $else(() =>
        VTL.string(AuthMode.NONE)
      )));
    }, $else(() => VTL.string(AuthMode.NONE)));
  }
}

