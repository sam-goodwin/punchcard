import { Trait } from "@punchcard/shape/lib/metadata";
import { NumberShape } from "@punchcard/shape/lib/primitive";

export interface Maximum<M extends number, E extends boolean = false> extends Trait<NumberShape, {maximum: M, exclusiveMaximum: E}> {}
export interface Minimum<M extends number, E extends boolean = false> extends Trait<NumberShape, {minimum: M, exclusiveMinimum: E}> {}
export interface MultipleOf<M extends number> extends Trait<NumberShape, {multipleOf: M}> {}

export function Maximum<L extends number, E extends boolean = false>(length: L, exclusive?: E): Maximum<L, E> {
  return {
    maximum: length,
    exclusiveMaximum: exclusive === true
  } as any;
}

export function Minimum<L extends number, E extends boolean = false>(length: L, exclusive?: E): Minimum<L, E> {
  return {
    minimum: length,
    exclusiveMinimum: exclusive === true
  } as any;
}
export function MultipleOf<M extends number>(multipleOf: M): MultipleOf<M> {
  return {
    multipleOf
  } as any;
}

export const Even = MultipleOf(2);