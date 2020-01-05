import { Trait } from "@punchcard/shape/lib/metadata";
import { StringShape } from "@punchcard/shape/lib/primitive";

export interface MaxLength<L extends number> extends Trait<StringShape, {maxLength: L}> {}
export interface MinLength<L extends number> extends Trait<StringShape, {minLength: L}> {}
export interface Pattern<P extends string> extends Trait<StringShape, {pattern: P}> {}

export function MaxLength<L extends number>(length: L): MaxLength<L> {
  return {
    maxLength: length
  } as any;
}

export function MinLength<L extends number>(length: L): MinLength<L> {
  return {
    minLength: length,
  } as any;
}

export function Pattern<P extends string>(pattern: P): Pattern<P> {
  return {
    pattern
  } as any;
}
