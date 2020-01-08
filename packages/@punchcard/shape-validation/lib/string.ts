import { Shape } from "@punchcard/shape";
import { Trait } from "@punchcard/shape/lib/metadata";
import { StringShape } from "@punchcard/shape/lib/primitive";
import { ValidationMetadata } from "./validator";

export interface MaxLength<L extends number> extends Trait<any, { maxLength: L} & ValidationMetadata<Shape>> {}
export interface MinLength<L extends number> extends Trait<any, { minLength: L} & ValidationMetadata<Shape>> {}
export interface Pattern<P extends string> extends Trait<StringShape, { pattern: P } & ValidationMetadata<StringShape>> {}

function validateLength(s: string | Buffer, length: number, operation: '<' | '>') {
  const isValid = operation === '>' ? s.length > length : s.length < length;
  if (!isValid) {
    return [new Error(`expected string with length ${operation} ${length}, but received: ${s}`)];
  }
  return undefined;
}

export function MaxLength<L extends number>(length: L): MaxLength<L> {
  return {
    [Trait.Data]: {
      maxLength: length,
      validator: [(s: string | Buffer) => validateLength(s, length, '>')]
    }
  };
}

export function MinLength<L extends number>(length: L): MinLength<L> {
  return {
    [Trait.Data]: {
      minLength: length,
      validator: [(s: string | Buffer) => validateLength(s, length, '<')]
    }
  };
}

export function Pattern<P extends string>(pattern: P): Pattern<P> {
  const regex = new RegExp(pattern);
  return {
    [Trait.Data]: {
      pattern,
      validator: [(s: string) => {
        if (!s.match(regex)) {
          return [new Error(`expected string to match regex pattern: ${pattern}`)];
        }
        return undefined;
      }]
    }
  };
}
