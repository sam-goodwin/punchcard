
import { Pointer, RecordMembers, RecordShape } from '@punchcard/shape';
import { ApiFragment } from './fragment';
import { ResolverImpl } from './syntax/resolver';
import { VObject } from './types/object';

export type TraitClass<T extends RecordShape, F extends RecordMembers> =
  new (fields: TraitClass.Fields<T, F>)
    => TraitClass.Fragment<T, F>
;

export namespace TraitClass {
  export type Fields<T extends RecordShape, F extends RecordMembers> =
    ThisType<VObject.Of<Pointer.Resolve<T>>> & {
      [f in keyof F]: ResolverImpl<{}, Pointer.Resolve<F[f]>>
    }
  ;
  export class Fragment<T extends RecordShape, F extends RecordMembers> extends ApiFragment<{
    [fqn in T['FQN']]: {
      type: T;
      fields: {
        [fieldName in F]: ResolverImpl<{}, Pointer.Resolve<F[fieldName]>>
      };
    };
  }> {
    constructor(type: Pointer<T>, fields: TraitClass.Fields<T, F>) {
      super({
        types: {
          [type.FQN]: {
            type,
            fields: self => {
              

              return null as any
            }
          }
        }
      } as any);
    }
  }
}

export function Trait<T extends RecordShape, F extends RecordMembers>(
  type: Pointer<T>,
  fields: F
): TraitClass<T, F> {
  return class extends TraitClass.Fragment<T, F>  {
    constructor(fields: TraitClass.Fields<T, F>) {
      super(type, fields);
    }
  };
}
