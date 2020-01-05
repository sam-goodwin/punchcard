import { Trait } from "@punchcard/shape/lib/metadata";
import { StringShape } from "@punchcard/shape/lib/primitive";
import { ValidationMetadata } from "./validator";

export interface MaxLength<L extends number> extends Trait<StringShape, { maxLength: L} & ValidationMetadata<string>> {}
export interface MinLength<L extends number> extends Trait<StringShape, { minLength: L} & ValidationMetadata<string>> {}
export interface Pattern<P extends string> extends Trait<StringShape, { pattern: P } & ValidationMetadata<string>> {}

function validateLength(s: string, length: number, operation: '<' | '>') {
  const isValid = operation === '>' ? s.length > length : s.length < length;
  if (!isValid) {
    return [new Error(`expected string with length ${operation} ${length}, but received: ${s}`)];
  }
  return undefined;
}

export function MaxLength<L extends number>(length: L): MaxLength<L> {
  return {
    maxLength: length,
    validator: [(s: string) => validateLength(s, length, '>')]
  } as any;
}

export function MinLength<L extends number>(length: L): MinLength<L> {
  return {
    minLength: length,
    validator: [(s: string) => validateLength(s, length, '<')]
  } as any;
}

export function Pattern<P extends string>(pattern: P): Pattern<P> {
  const regex = new RegExp(pattern);
  return {
    pattern,
    validator: [(s: string) => {
      if (!s.match(regex)) {
        return [new Error(`expected string to match regex pattern: ${pattern}`)];
      }
      return undefined;
    }]
  } as any;
}
