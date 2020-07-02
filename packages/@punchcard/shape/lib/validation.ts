import { ArrayShape, MapShape, SetShape } from './collection';
import { EnumShape } from './enum';
import { FunctionArgs, FunctionShape } from './function';
import { IsInstance } from './is-instance';
import { LiteralShape } from './literal';
import { Meta } from './metadata';
import { Trait } from './metadata';
import { AnyShape, BinaryShape, BoolShape, IntegerShape, NeverShape, NothingShape, NumberShape, StringShape, TimestampShape } from './primitive';
import { Shape } from './shape';
import { TypeShape } from './type';
import { UnionShape } from './union';
import { Value } from './value';
import { ShapeVisitor } from './visitor';

export interface ValidationErrors extends Array<Error> {}

export type Validator<T> = (value: T, path: string) => ValidationErrors;

export interface ValidationMetadata<T extends Shape> {
  validator: Validator<Value.Of<T>>[];
}

export function MakeValidator<T extends Shape>(validator: Validator<Value.Of<T>>): ValidationMetadata<T> {
  return {
    validator: [validator]
  };
}

export namespace Validator {
  export function of<T extends Shape>(shape: T): Validator<Value.Of<T>> {
    const decoratedValidators =  (Meta.get(shape, ['validator']) || {}).validator || [];
    // console.log(shape);

    const validators = decoratedValidators.concat(shape.visit(visitor, '$'));

    return (a: any, path) => validators
      .map((v: Validator<any>) => v(a, path))
      .reduce((a: any[], b: any[]) => a.concat(b), []);
  }

  class Visitor implements ShapeVisitor<Validator<any>[], string> {
    public enumShape(shape: EnumShape<any, any>, context: string): Validator<any>[] {
      const values = Object.values(shape.Values);
      return [(item: any, path: string) => {
        if (typeof item !== 'string') {
          return [new Error(`expected string value for enum, got ${item} at ${path}`)];
        } else if (values.indexOf(item) === -1) {
          return [new Error(`expected one of (${values.join(',')}), got ${item} at ${path}`)];
        }
        return [];
      }];
    }
    public unionShape(shape: UnionShape<Shape[]>, context: string): Validator<any>[] {
      const isTypes = shape.Items.map(item => [IsInstance.of(item), Validator.of(item)] as const);
      return [(item: any, path: string) => {
        for (const [isType, validator] of isTypes) {
          if (isType(item)) {
            return validator(item, path);
          }
        }
        return [];
      }];
    }
    public literalShape(shape: LiteralShape<Shape, any>, context: string): Validator<any>[] {
      const isType = IsInstance.of(shape.Type, {
        deep: true
      });
      return [((value: any, path: string) => {
        if (!isType(value)) {
          return [
            new Error(`expected literal value: ${shape.Value}, got ${value}, at: ${path}`)
          ];
        }
        return [];
      })];
    }
    public neverShape(shape: NeverShape, context: string): Validator<any>[] {
      return [];
    }
    public functionShape(shape: FunctionShape<FunctionArgs, Shape>): Validator<any>[] {
      return [];
    }
    public nothingShape(shape: NothingShape, context: string): Validator<any>[] {
      return [];
    }
    public anyShape(shape: AnyShape): Validator<any>[] {
      return [];
    }
    public arrayShape(shape: ArrayShape<any>): Validator<any>[] {
      const validateItem = of(shape.Items);
      return [(arr: any[], path: string) => arr.map((item, i) => validateItem(item, `${path}[${i}]`) as any[]).reduce((a: any[], b: any[]) => a.concat(b), [])];
    }
    public binaryShape(shape: BinaryShape): Validator<any>[] {
      return [];
    }
    public boolShape(shape: BoolShape): Validator<any>[] {
      return [];
    }
    public recordShape(shape: TypeShape<any>): Validator<any>[] {
      const validators: {
        [key: string]: Validator<any>[];
      } = {};
      for (const [name, member] of Object.entries(shape.Members)) {
        validators[name] = [of(member as any)];
      }
      return [(obj, path) => {
        return Object.entries(validators)
          .map(([name, vs]) => vs
            .map((v: Validator<any>) => v(obj[name], `${path}['${name}']`))
            .reduce((a: any[], b: any[]) => a.concat(b), []))
          .reduce((a: any[], b: any[]) => a.concat(b), []);
      }];
    }
    public mapShape(shape: MapShape<any>): Validator<any>[] {
      const item = of(shape.Items);
      return [(arr: {[key: string]: any}, path) => Object
        .values(arr)
        .map(key => item(key, `${path}['${key}']`) as any[])
        .reduce((a: any[], b: any[]) => a.concat(b), [])];
    }
    public numberShape(shape: NumberShape): Validator<any>[] {
      return [];
    }
    public integerShape(shape: IntegerShape, context: string): Validator<any>[] {
      return [(v: number) => v % 1 === 0 ? [] : [new Error(`integers must be whole numbers, but got: ${v}`)]];
    }
    public setShape(shape: SetShape<any>): Validator<any>[] {
      const item = of(shape.Items);
      return [(set: Set<any>, path) => Array.from(set).map(i => item(i, `${path}['${path}']`) as any[]).reduce((a: any[], b: any[]) => a.concat(b), [])];
    }
    public stringShape(shape: StringShape): Validator<any>[] {
      return [];
    }
    public timestampShape(shape: TimestampShape): Validator<any>[] {
      return [];
    }
  }
  const visitor = new Visitor();
}

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
