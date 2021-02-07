import { Fields } from '@punchcard/shape';
import { ApiFragment } from './api-fragment';
import { AuthMetadata } from './auth';
import { CacheMetadata } from './caching';
import { FieldResolver } from './resolver';
import { QueryRoot } from './root';

export type QueryTraitClass<F extends Fields> = (
  new(impl: QueryTraitImpl<F>) => QueryTraitFragment<F>
);

export function Query<F extends Fields = Fields>(fields: F): QueryTraitClass<F> {
  return class extends QueryTraitFragment<F> {
    constructor(impl: QueryTraitImpl<F>) {
      super(fields, impl);
    }
  };
}

export class QueryTraitFragment<F extends Fields> extends ApiFragment<typeof QueryRoot, F> {
  constructor(fields: F, impl: QueryTraitImpl<F>) {
    super(QueryRoot, fields, impl);
  }
}

/**
 * Implementation of the field resolvers in a Trait.
 */
export type QueryTraitImpl<
  F extends Fields
> = {
  [f in keyof F]:
    & AuthMetadata
    & CacheMetadata<F[f]>
    & FieldResolver<typeof QueryRoot, F[f], true>
  ;
};

