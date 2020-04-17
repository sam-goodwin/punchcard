import { RecordMembers } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { Subscribe } from '../lang';
import { AuthMetadata } from './auth';
import { FieldResolver } from './resolver';
import { MutationRoot } from './root';
import { Trait, TraitFragment } from './trait';

export type MutationTraitClass<F extends RecordMembers> = (
  new(impl: MutationTraitImpl<F>) => MutationTraitFragment<F>
);

export function Mutation<F extends RecordMembers = RecordMembers>(fields: F): MutationTraitClass<F> {
  return class extends Trait(MutationRoot, fields) {
    public subscription<Field extends keyof F>(
      field: Field
    ): F[Field] extends FunctionShape<any, infer Ret> ? Subscribe<Ret> : Subscribe<F[Field]> {
      return new Subscribe(field as any, this.type) as any;
    }
  } as any;
}

export class MutationTraitFragment<F extends RecordMembers> extends TraitFragment<typeof MutationRoot, F> {
  public subscription<Field extends keyof F>(
    field: Field
  ): F[Field] extends FunctionShape<any, infer Ret> ? Subscribe<Ret> : Subscribe<F[Field]> {
    return new Subscribe(field as any, this.type) as any;
  }
}

export type MutationTraitImpl<
  Fields extends RecordMembers
> = {
  [f in keyof Fields]:
    AuthMetadata &
    FieldResolver<typeof MutationRoot, Fields[f], true>
  ;
};
