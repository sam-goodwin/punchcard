import { RecordMembers } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { MutationRoot } from '../api/mutation';
import { TraitFragment } from '../api/trait';
import { $auth } from './auth';
import { Subscribe } from './subscription';

export namespace $appsync {
  export const auth = $auth;

  export function subscribeTo<T extends TraitFragment<typeof MutationRoot, RecordMembers>, F extends keyof T['fields']>(
    fragment: T,
    field: F
  ): Subscribe<T['fields'][F] extends FunctionShape<{}, infer Ret> ? Ret : T['fields'][F]> {
    return null as any;
  }
}