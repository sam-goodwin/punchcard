
import { RecordShape } from '@punchcard/shape';
import { Resolved } from './syntax/resolver';
import { VObject } from './types/object';

export type Fields = {
  [fieldName: string]: Resolved<any> | undefined;
};

export interface Methods {
  [methodName: string]: Resolved<any>;
}

export function impl<T extends RecordShape, F extends Fields>(type: T, fields: (self: VObject.Of<T>) => F): Resolvers<T, F> {
  return {
    type,
    fields
  };
}

export interface Resolvers<T extends RecordShape = any, F extends Fields = Fields> {
  type: T;
  fields: (self: VObject.Of<T>) => F;
}

/**
 * A map from a type's FQN to its field-level resolvers.
 */
export interface TypeIndex {
  [fqn: string]: Resolvers;
}
export namespace TypeIndex {
  export type LookupType<FQN extends string, T extends Resolvers[]> =
    Extract<
      T[Extract<keyof T, number>]['type'],
      { FQN: FQN; }
    >;

  export type LookupFields<FQN extends string, T extends Resolvers[]> =
    ReturnType<Extract<T[Extract<keyof T, number>], {
      type: {
        FQN: FQN;
      }
    }>['fields']>;

  export type FromTuple<T extends Resolvers[]> = {
    [fqn in T[Extract<keyof T, number>]['type']['FQN']]:
      Resolvers<LookupType<fqn, T>, LookupFields<fqn, T>>
    ;
  };
}
