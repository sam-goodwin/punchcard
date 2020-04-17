import { Record, RecordMembers } from '@punchcard/shape';
import { FixedTraitClass, Trait } from './trait';

export function Query<F extends RecordMembers = RecordMembers>(fields: F): QueryTraitClass<F> {
  return Trait(fields, QueryRoot);
}

export class QueryRoot extends Record('Query', {}) {}
export namespace QueryRoot {
  export type FQN = typeof QueryRoot.FQN;
}

export interface QueryTraitClass<F extends RecordMembers> extends FixedTraitClass<typeof QueryRoot, F> {}
