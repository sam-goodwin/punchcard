
import { AssertIsShape, Pointer, RecordMembers, RecordShape, ArrayShape, StringShape, Record, string, array, Shape } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { ApiFragment } from './fragment';
import { ResolverImpl } from './syntax/resolver';
import { VObject } from './types/object';
import { ID } from './types';

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

  // export type FindTypes<T extends Shape> =
  //   T extends FunctionShape<{}, infer Returns> ? Returns :
  //   T extends ArrayShape<infer Items> ?
  //     Items extends RecordShape ? Items : undefined :
  //   never
  // ;

  // export type FindTypes<F extends RecordMembers> =
  //   Extract<
  //     F[keyof F] extends FunctionShape<{}, infer Returns> ?
  //       Returns extends RecordShape ? Returns : undefined :
  //     F[keyof F] extends ArrayShape<infer Item> ?
  //       Item extends RecordShape ? Item : undefined :
  //     F[keyof F] extends RecordShape ? F[keyof F] :
  //     undefined,
  //   RecordShape>
  // ;

  class A extends Record('A', {
    key: string
  }) {}
  class B extends Record('B', {
    key: array(A)
  }) {}

  // const a: FindTypes<{
  //   f2: FunctionShape<{id: typeof ID}, typeof B>
  // }>;

  export class Fragment<T extends RecordShape, F extends RecordMembers> extends ApiFragment<{
    [fqn in T['FQN']]: {
      type: T;
      fields: {
        [fieldName in keyof F]: ResolverImpl<{}, Pointer.Resolve<F[fieldName]>>
      };
    };
  }> {
    constructor(type: T, fields: TraitClass.Fields<T, F>) {
      super({
        types: {
          [type.FQN]: {
            type,
            fields: self => {


              return null as any;
            }
          }
        }
      } as any);
    }
  }
}

export function Trait<T extends RecordShape, F extends RecordMembers>(
  type: T,
  fields: F
): TraitClass<T, F> {
  return class extends TraitClass.Fragment<T, F>  {
    constructor(fields: TraitClass.Fields<T, F>) {
      super(type, fields);
    }
  };
}
