import { Record, RecordMembers } from '@punchcard/shape';
import { Trait, FixedTraitClass } from './trait';

export namespace Root {
  export class Query extends Record('Query', {}) {}
  
  // root of mutation interface
  export class Mutation extends Record('Mutation', {}) {}
  
  export class Subscription extends Record('Subscription', {}) {}
}

export function Query<F extends RecordMembers = RecordMembers>(fields: F): FixedTraitClass<F, typeof Root.Query> {
  return Trait(fields, Root.Query);
}

export function Mutation<F extends RecordMembers = RecordMembers>(fields: F): FixedTraitClass<F, typeof Root.Mutation> {
  return Trait(fields, Root.Mutation);
}

export function Subscription<F extends RecordMembers = RecordMembers>(fields: F): FixedTraitClass<F, typeof Root.Subscription> {
  return Trait(fields, Root.Subscription);
}