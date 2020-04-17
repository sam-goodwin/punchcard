import { RecordMembers } from '@punchcard/shape';
import { AuthMetadata } from './auth';
import { CacheMetadata } from './caching';
import { FieldResolver } from './resolver';
import { QueryRoot } from './root';
import { Trait, TraitFragment } from './trait';

export type QueryTraitClass<F extends RecordMembers> = (
  new(impl: QueryTraitImpl<F>) => QueryTraitFragment<F>
);

export function Query<F extends RecordMembers = RecordMembers>(fields: F): QueryTraitClass<F> {
  return class extends Trait(QueryRoot, fields) {
    constructor(impl: QueryTraitImpl<F>) {
      super(impl as any);
    }
  };
}

export class QueryTraitFragment<
  Fields extends RecordMembers
> extends TraitFragment<
  typeof QueryRoot,
  Fields
> {}

/**
 * Implementation of the field resolvers in a Trait.
 */
export type QueryTraitImpl<
  Fields extends RecordMembers
> = {
  [f in keyof Fields]:
    & AuthMetadata
    & CacheMetadata<Fields[f]>
    & FieldResolver<typeof QueryRoot, Fields[f], true>
  ;
};

