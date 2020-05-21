import { RecordMembers } from '@punchcard/shape';
import { ApiFragment } from './api-fragment';
import { AuthMetadata } from './auth';
import { CacheMetadata } from './caching';
import { FieldResolver } from './resolver';
import { QueryRoot } from './root';

export type QueryTraitClass<F extends RecordMembers> = (
  new(impl: QueryTraitImpl<F>) => QueryTraitFragment<F>
);

export function Query<F extends RecordMembers = RecordMembers>(fields: F): QueryTraitClass<F> {
  return class extends QueryTraitFragment<F> {
    constructor(impl: QueryTraitImpl<F>) {
      super(fields, impl);
    }
  };
}

export class QueryTraitFragment<Fields extends RecordMembers> extends ApiFragment<typeof QueryRoot, Fields> {
  constructor(fields: Fields, impl: QueryTraitImpl<Fields>) {
    super(QueryRoot, fields, impl);
  }
}

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

