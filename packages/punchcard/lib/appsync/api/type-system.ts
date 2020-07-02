import { ArrayShape, Fields, TypeShape, } from '@punchcard/shape';
import { FunctionShape } from '@punchcard/shape/lib/function';
import { TraitImpl } from './trait';

export interface TypeSpec<F extends Fields = Fields> {
  readonly type: TypeShape<{}, string>;
  readonly fields: F;
  readonly resolvers: TraitImpl<TypeShape<{}, string>, {}, boolean>;
}

/**
 * A map from a type's FQN to its field-level resolvers.
 */
export interface TypeSystem {
  [fqn: string]: TypeSpec;
}

export namespace TypeSystem {
  // extracts any types that should be indexed by traversing RecordMembers and finding all RecordShapes.
  type ExtractTypes<F extends Fields> =
    | Extract<F[keyof F], TypeShape<any, any>>
    | Extract<F[keyof F], FunctionShape<any, TypeShape<any, any>>>['returns']
    | Extract<F[keyof F], FunctionShape<any, ArrayShape<TypeShape<any, any>>>>['returns']['Items']
    | Extract<F[keyof F], FunctionShape<any, ArrayShape<ArrayShape<TypeShape<any, any>>>>>['returns']['Items']['Items']
    ;

  // walk the record members and index them in a TypeSystem
  export type Collect<F extends Fields> = {
    [fqn in ExtractTypes<F>['FQN']]: {
      type: Extract<ExtractTypes<F>, TypeShape<any, fqn>>;
      fields: Extract<ExtractTypes<F>, TypeShape<any, fqn>>['Members'];
      resolvers: {}
    }
  };

  export type Flatten<T extends TypeSystem[]> = {
    [fqn in keyof T[Extract<keyof T, number>]]:
      Extract<T[Extract<keyof T, number>][keyof T[Extract<keyof T, number>]], {
        type: { FQN: fqn; };
      }>
  };
}
