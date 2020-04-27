import { string } from '@punchcard/shape';
import { AuthMetadata, AuthMode, AuthProps } from '../api/auth';
import { $context } from '../lang/context';
import { directive } from '../lang/statement';
import { $else, $elseIf, $if } from './syntax';
import { $util } from './util/util';
import { VTL } from './vtl';
import { VNothing, VString } from './vtl-object';

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
  export function *allow(props: AuthMetadata): VTL<VNothing> {
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
      return yield* $if($context.identity.cognitoIdentityPoolId.as(string).isNotEmpty(), () =>
        VTL.string(AuthMode.AMAZON_COGNITO_USER_POOLS)
      , $elseIf($context.identity.accountId.as(string).isNotEmpty(), () =>
        VTL.string(AuthMode.AWS_IAM)
      , $else(() =>
        VTL.string(AuthMode.NONE)
      )));
    }, $else(() => VTL.string(AuthMode.NONE)));
  }
}

