import {ArrayShape, MapShape, SetShape} from "./collection";
import {
  BinaryShape,
  BoolShape,
  DynamicShape,
  IntegerShape,
  NothingShape,
  NumberShape,
  StringShape,
  TimestampShape,
} from "./primitive";
import {Meta} from "./metadata";
import {RecordShape} from "./record";
import {Shape} from "./shape";
import {ShapeVisitor} from "./visitor";
import {Trait} from "./metadata";
import {Value} from "./value";

export type ValidationErrors = Array<Error>;

export type Validator<T> = (value: T, path: string) => ValidationErrors;

export interface ValidationMetadata<T extends Shape> {
  validator: Validator<Value.Of<T>>[];
}

export function MakeValidator<T extends Shape>(
  validator: Validator<Value.Of<T>>,
): ValidationMetadata<T> {
  return {
    validator: [validator],
  };
}

export namespace Validator {
  export function of<T extends Shape>(shape: T): Validator<Value.Of<T>> {
    const decoratedValidators =
      (Meta.get(shape, ["validator"]) || {}).validator || [];
    // console.log(shape);

    const validators = decoratedValidators.concat(shape.visit(visitor, "$"));

    return (a: T, path: string): ValidationErrors =>
      validators
        .map((v: Validator<any>) => v(a, path))
        .reduce((a: any[], b: any[]) => a.concat(b), []);
  }

  class Visitor implements ShapeVisitor<Validator<any>[], string> {
    public nothingShape(
      _shape: NothingShape,
      _context: string,
    ): Validator<any>[] {
      return [];
    }
    public dynamicShape(_shape: DynamicShape<any>): Validator<any>[] {
      return [];
    }
    public arrayShape(shape: ArrayShape<any>): Validator<any>[] {
      const validateItem = of(shape.Items);
      return [
        (arr: any[], path: string) =>
          arr
            .map((item, i) => validateItem(item, `${path}[${i}]`) as any[])
            .reduce((a: any[], b: any[]) => a.concat(b), []),
      ];
    }
    public binaryShape(_shape: BinaryShape): Validator<any>[] {
      return [];
    }
    public boolShape(_shape: BoolShape): Validator<any>[] {
      return [];
    }
    public recordShape(shape: RecordShape<any>): Validator<any>[] {
      const validators: {
        [key: string]: Validator<any>[];
      } = {};
      for (const [name, member] of Object.entries(shape.Members)) {
        validators[name] = [of(member as any)];
      }
      return [
        (obj, path) => {
          return Object.entries(validators)
            .map(([name, vs]) =>
              vs
                .map((v: Validator<any>) => v(obj[name], `${path}['${name}']`))
                .reduce((a: any[], b: any[]) => a.concat(b), []),
            )
            .reduce((a: any[], b: any[]) => a.concat(b), []);
        },
      ];
    }
    public mapShape(shape: MapShape<any>): Validator<any>[] {
      const item = of(shape.Items);
      return [
        (arr: {[key: string]: any}, path) =>
          Object.values(arr)
            .map((key) => item(key, `${path}['${key}']`) as any[])
            .reduce((a: any[], b: any[]) => a.concat(b), []),
      ];
    }
    public numberShape(_shape: NumberShape): Validator<any>[] {
      return [];
    }
    public integerShape(
      _shape: IntegerShape,
      _context: string,
    ): Validator<any>[] {
      return [
        (v: number) =>
          v % 1 === 0
            ? []
            : [new Error(`integers must be whole numbers, but got: ${v}`)],
      ];
    }
    public setShape(shape: SetShape<any>): Validator<any>[] {
      const item = of(shape.Items);
      return [
        (set: Set<any>, path) =>
          [...set]
            .map((i) => item(i, `${path}['${path}']`) as any[])
            .reduce((a: any[], b: any[]) => a.concat(b), []),
      ];
    }
    public stringShape(_shape: StringShape): Validator<any>[] {
      return [];
    }
    public timestampShape(_shape: TimestampShape): Validator<any>[] {
      return [];
    }
  }
  const visitor = new Visitor();
}

export type Maximum = Trait<any, {maximum: M; exclusiveMaximum: E}>;
export type Minimum = Trait<any, {minimum: M; exclusiveMinimum: E}>;
export type MultipleOf = Trait<any, {multipleOf: M}>;

export function Maximum<L extends number, E extends boolean = false>(
  length: L,
  exclusive?: E,
): Maximum<L, E> {
  return {
    [Trait.Data]: {
      exclusiveMaximum: (exclusive === true) as E,
      maximum: length,
    },
  };
}

export function Minimum<L extends number, E extends boolean = false>(
  length: L,
  exclusive?: E,
): Minimum<L, E> {
  return {
    [Trait.Data]: {
      exclusiveMinimum: (exclusive === true) as E,
      minimum: length,
    },
  };
}
export function MultipleOf<M extends number>(multipleOf: M): MultipleOf<M> {
  return {
    [Trait.Data]: {
      multipleOf,
    },
  };
}

export const Even = MultipleOf(2);

export type MaxLength = Trait<
  any,
  {maxLength: L; exclusiveMaximum: E} & ValidationMetadata<Shape>
>;
export type MinLength = Trait<
  any,
  {minLength: L; exclusiveMinimum: E} & ValidationMetadata<Shape>
>;
export type Pattern = Trait<
  StringShape,
  {pattern: P} & ValidationMetadata<StringShape>
>;

function validateLength(
  path: string,
  s: string | Buffer,
  length: number,
  operation: "<" | "<=" | ">" | ">=",
) {
  const isValid =
    operation === ">"
      ? s.length > length
      : operation === ">="
      ? s.length >= length
      : operation === "<"
      ? s.length < length
      : s.length <= length;

  if (!isValid) {
    return [
      new Error(
        `at ${path}: expected string with length ${operation} ${length}, but received: ${s}`,
      ),
    ];
  }
  return [];
}

export function MaxLength<L extends number, E extends boolean = false>(
  length: L,
  exclusive: E = false as any,
): MaxLength<L, E> {
  return {
    [Trait.Data]: {
      exclusiveMaximum: exclusive === true,
      maxLength: length,
      validator: [
        (s: string | Buffer, path: string) =>
          validateLength(path, s, length, exclusive ? "<" : "<="),
      ],
    } as any,
  };
}

export function MinLength<L extends number, E extends boolean = false>(
  length: L,
  exclusive: E = false as any,
): MinLength<L, E> {
  return {
    [Trait.Data]: {
      exclusiveMinimum: exclusive === true,
      minLength: length,
      validator: [
        (s: string | Buffer, path: string) =>
          validateLength(path, s, length, exclusive ? ">" : ">="),
      ],
    } as any,
  };
}

export function Pattern<P extends string>(pattern: P): Pattern<P> {
  const regex = new RegExp(pattern);
  return {
    [Trait.Data]: {
      pattern,
      validator: [
        (s: string) => {
          if (!s.match(regex)) {
            return [
              new Error(`expected string to match regex pattern: ${pattern}`),
            ];
          }
          return [];
        },
      ],
    },
  };
}
