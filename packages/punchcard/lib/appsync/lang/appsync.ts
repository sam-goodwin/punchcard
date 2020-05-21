import { RecordMembers } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { ApiFragment } from '../api/api-fragment';
import { MutationRoot } from '../api/root';
import { $auth } from './auth';
import { Subscribe } from './subscription';

export namespace $appsync {
  export const auth = $auth;

  export function subscribeTo<T extends ApiFragment<typeof MutationRoot, RecordMembers>, F extends keyof T['fields']>(
    fragment: T,
    field: F
  ): Subscribe<T['fields'][F] extends FunctionShape<{}, infer Ret> ? Ret : T['fields'][F]> {
    return null as any;
  }
}