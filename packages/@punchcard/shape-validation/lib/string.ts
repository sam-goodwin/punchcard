import { Shape } from "@punchcard/shape";
import { Trait } from "@punchcard/shape/lib/metadata";
import { StringShape } from "@punchcard/shape/lib/primitive";
import { ValidationMetadata } from "./validator";

export interface MaxLength<L extends number, E extends boolean> extends Trait<any, { maxLength: L, exclusiveMaximum: E; } & ValidationMetadata<Shape>> {}
export interface MinLength<L extends number, E extends boolean> extends Trait<any, { minLength: L, exclusiveMinimum: E; } & ValidationMetadata<Shape>> {}
export interface Pattern<P extends string> extends Trait<StringShape, { pattern: P } & ValidationMetadata<StringShape>> {}

function validateLength(path: string, s: string | Buffer, length: number, operation: '<' | '<=' | '>' | '>=') {
  const isValid =
     operation === '>' ? s.length > length :
     operation === '>=' ? s.length >= length :
     operation === '<' ? s.length < length :
     s.length <= length;

  if (!isValid) {
    return [new Error(`at ${path}: expected string with length ${operation} ${length}, but received: ${s}`)];
  }
  return [];
}

export function MaxLength<L extends number, E extends boolean = false>(length: L, exclusive: E = false as any): MaxLength<L, E> {
  return {
    [Trait.Data]: {
      maxLength: length,
      exclusiveMaximum: exclusive === true,
      validator: [(s: string | Buffer, path: string) => validateLength(path, s, length, exclusive ? '<' : '<=')]
    } as any
  };
}

export function MinLength<L extends number, E extends boolean = false>(length: L, exclusive: E = false as any): MinLength<L, E> {
  return {
    [Trait.Data]: {
      minLength: length,
      exclusiveMinimum: exclusive === true,
      validator: [(s: string | Buffer, path: string) => validateLength(path, s, length, exclusive ? '>' : '>=')]
    } as any
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
        return [];
      }]
    }
  };
}
