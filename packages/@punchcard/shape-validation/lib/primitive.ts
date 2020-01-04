import { MetadataGuards } from '@punchcard/shape/lib/guards';
import { PropertyAnnotation } from '../../shape/lib/decorator';
import { StringShape } from '../../shape/lib/primitive';
import { ValidationErrors, Validator } from './validator';

declare module '@punchcard/shape/lib/guards' {
  namespace MetadataGuards {
    function isPatternConstraint(a: any): a is PatternConstraint;
    function isMaxLengthConstraint(a: any): a is LengthConstraint<LengthComparison.Lt | LengthComparison.Lte>;
    function isMinLengthConstraint(a: any): a is LengthConstraint<LengthComparison.Gt | LengthComparison.Gte>;
  }
}

MetadataGuards.isPatternConstraint = (a: any): a is PatternConstraint => a[patternKey] === true;
MetadataGuards.isMaxLengthConstraint = (a: any): a is LengthConstraint<LengthComparison.Lt | LengthComparison.Lte> => a.comparison === LengthComparison.Lt || a.comparison === LengthComparison.Lte;
MetadataGuards.isMinLengthConstraint = (a: any): a is LengthConstraint<LengthComparison.Gt | LengthComparison.Gte> => a.comparison === LengthComparison.Gt || a.comparison === LengthComparison.Gte;

const patternKey = Symbol.for('@punchcard/shape-validation.Pattern');

export const Pattern = (pattern: RegExp) => PropertyAnnotation<StringShape>((target, propertyKey) => {
  Reflect.defineMetadata(pattern, new PatternConstraint(pattern), target, propertyKey);
});

export class PatternConstraint {
  public static get(metadata: any): PatternConstraint | undefined {
    return metadata[patternKey];
  }

  public readonly [patternKey]: true = true;

  constructor(public readonly pattern: RegExp) {}
}
export class PatternValidator implements Validator<string> {
  constructor(private readonly constraint: PatternConstraint) {}
  public validate(value: string): void | ValidationErrors {
    if (!value.match(this.constraint.pattern)) {
      return [new Error(`expected string, '${value}' to match pattern: ${this.constraint.pattern.source}`)];
    }
  }
}

export const Length = (key: symbol, comparison: LengthComparison, length: number) => PropertyAnnotation<StringShape>((target, propertyKey) => {
  Reflect.defineMetadata(key, new LengthConstraint(comparison, length), target, propertyKey);
});

const minLength = Symbol.for('@punchcard/shape-validation.MinLength');
const maxLength = Symbol.for('@punchcard/shape-validation.MaxLength');

export const MinLength = (length: number, exclusive?: boolean) => Length(minLength, exclusive ? LengthComparison.Gt : LengthComparison.Gte, length);
export const MaxLength = (length: number, exclusive?: boolean) => Length(maxLength, exclusive ? LengthComparison.Lt : LengthComparison.Lte, length);

export enum LengthComparison {
  Gt = '>',
  Gte = '>=',
  Lt = '<',
  Lte = '<=',
}

export class LengthConstraint<C extends LengthComparison, L extends number = any> {
  constructor(public readonly comparison: C, public readonly length: L) {}
}

export class LengthValidator<C extends LengthConstraint<any>> implements Validator<string> {
  constructor(public readonly constraint: C) {}

  public validate(value: string): void | ValidationErrors {
    if (this.compare(value.length)) {
      return [new Error(`string '${value}' must be ${this.constraint.comparison} ${this.constraint.length}`)];
    }
  }

  private compare(value: number): boolean {
    switch (this.constraint.comparison) {
      case '>': return value > this.constraint.length;
      case '>=': return value >= this.constraint.length;
      case '<': return value < this.constraint.length;
      case '<=': return value <= this.constraint.length;
    }
    return false;
  }
}
