import { Record, RecordMembers } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { Subscribe } from '../lang';
import { Trait, TraitFragment, TraitImpl } from './trait';

export function Mutation<F extends RecordMembers = RecordMembers>(fields: F): MutationTraitClass<F> {
  return Trait(fields, MutationRoot);
}

export class MutationRoot extends Record('Mutation', {}) {}
export namespace MutationRoot {
  export type FQN = typeof MutationRoot.FQN;
}

export class MutationTraitFragment<F extends RecordMembers> extends TraitFragment<typeof MutationRoot, F> {
  public subscription<Field extends keyof F>(
    field: Field
  ): F[Field] extends FunctionShape<any, infer Ret> ? Subscribe<Ret> : Subscribe<F[Field]> {
    return new Subscribe(field as any, this.type) as any;
  }
}

export type MutationTraitClass<F extends RecordMembers> = (
  new(impl: TraitImpl<typeof MutationRoot, F>) => MutationTraitFragment<F>
);

