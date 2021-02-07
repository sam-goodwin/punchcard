import { Fields } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { Subscribe } from '../lang';
import { ApiFragment } from './api-fragment';
import { AuthMetadata } from './auth';
import { FieldResolver } from './resolver';
import { MutationRoot } from './root';
import { Trait } from './trait';

export type MutationTraitClass<F extends Fields> = (
  new(impl: MutationTraitImpl<F>) => MutationTraitFragment<F>
);

export function Mutation<F extends Fields = Fields>(fields: F): MutationTraitClass<F> {
  return class extends Trait(MutationRoot, fields) {
    public subscription<Field extends keyof F>(
      field: Field
    ): F[Field] extends FunctionShape<any, infer Ret> ? Subscribe<Ret> : Subscribe<F[Field]> {
      return new Subscribe(field as any, this.type) as any;
    }
  } as any;
}

export class MutationTraitFragment<F extends Fields> extends ApiFragment<typeof MutationRoot, F> {
  public subscription<Field extends keyof F>(
    field: Field
  ): F[Field] extends FunctionShape<any, infer Ret> ? Subscribe<Ret> : Subscribe<F[Field]> {
    return new Subscribe(field as any, this.type) as any;
  }
}

export type MutationTraitImpl<
  F extends Fields
> = {
  [f in keyof F]:
    AuthMetadata &
    FieldResolver<typeof MutationRoot, F[f], true>
  ;
};
