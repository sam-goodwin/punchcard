import { Trait } from "@punchcard/shape/lib/metadata";

export interface Maximum<M extends number, E extends boolean = false> extends Trait<any, {maximum: M, exclusiveMaximum: E}> {}
export interface Minimum<M extends number, E extends boolean = false> extends Trait<any, {minimum: M, exclusiveMinimum: E}> {}
export interface MultipleOf<M extends number> extends Trait<any, {multipleOf: M}> {}

export function Maximum<L extends number, E extends boolean = false>(length: L, exclusive?: E): Maximum<L, E> {
  return {
    [Trait.Data]: {
      maximum: length,
      exclusiveMaximum: (exclusive === true) as E
    }
  };
}

export function Minimum<L extends number, E extends boolean = false>(length: L, exclusive?: E): Minimum<L, E> {
  return {
    [Trait.Data]: {
      minimum: length,
      exclusiveMinimum: (exclusive === true) as E
    }
  };
}
export function MultipleOf<M extends number>(multipleOf: M): MultipleOf<M> {
  return {
    [Trait.Data]: {
      multipleOf
    }
  };
}

export const Even = MultipleOf(2);