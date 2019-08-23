import { BeginsWith, ConditionValue, Contains, DynamoPath, OrdPath } from '../../storage/dynamodb/expression/path';
import { hashCode } from './hash';
import { Kind } from './kind';
import { PrimitiveType } from './primitive';
import { Type } from './type';

export interface StringTypeConstraints {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

const symbol = Symbol.for('punchcard:type:string');

export abstract class BaseStringType extends PrimitiveType<string> {
  public readonly [symbol]: string = 'string';

  constructor(private readonly constraints: StringTypeConstraints = {}) {
    super(Kind.String);
  }

  public toDynamoPath(parent: DynamoPath, name: string): StringDynamoPath<this, string> {
    return new StringDynamoPath(parent, name, this);
  }

  public toJsonSchema(): object {
    const schema: any = {
      type: 'string',
      ...this.constraints
    };
    if (this.constraints.pattern) {
      schema.pattern = this.constraints.pattern.source;
    }
    return schema;
  }

  public abstract toGlueType(): { inputString: string; isPrimitive: boolean; };

  public validate(value: string): void {
    const len = value.length;
    if (this.constraints) {
      if (this.constraints.minLength !== undefined && len < this.constraints.minLength) {
        throw new Error(`string length of ${len} is less than minimum ${this.constraints.minLength}`);
      }
      if (this.constraints.maxLength !== undefined && len > this.constraints.maxLength) {
        throw new Error(`string length of ${len} exceeds maximum ${this.constraints.minLength}`);
      }
      if (this.constraints.pattern !== undefined) {
        if (value.match(this.constraints.pattern) === null) {
          throw new Error(`string does not match pattern '${this.constraints.pattern.source}'`);
        }
      }
    }
  }

  public isType(a: any): a is this {
    return a[symbol] === this[symbol];
  }

  public isInstance(a: any): a is string {
    return typeof a === 'string';
  }

  public hashCode(value: string): number {
    return hashCode(value);
  }
}

export class StringType extends BaseStringType {
  public toGlueType() {
    return {
      inputString: 'string',
      isPrimitive: true
    };
  }
}

export interface FixedLengthConstraints {
  minLength?: number;
  pattern?: RegExp;
}
class FixedLength extends BaseStringType {
  constructor(private readonly name: string, private readonly length: number, props: FixedLengthConstraints = {}) {
    super({
      maxLength: length,
      ...props
    });
  }
  public toGlueType() {
    return {
      inputString: `${this.name}(${this.length})`,
      isPrimitive: true
    };
  }
}

const standardString = new StringType();
export function string(constraints?: StringTypeConstraints) {
  if (constraints) {
    return new StringType(constraints);
  } else {
    return standardString;
  }
}

export function char(length: number, constraints?: FixedLengthConstraints) {
  if (length > 255) {
    throw new Error(`char length must be between 1 and 255, got ${length}`);
  }
  return new FixedLength('char', length, constraints);
}

export function varchar(length: number, constraints?: FixedLengthConstraints) {
  if (length > 65535) {
    throw new Error(`varchar length must be between 1 and 65535, got ${length}`);
  }
  return new FixedLength('varchar', length, constraints);
}

export class StringDynamoPath<T extends Type<V>, V> extends OrdPath<T, V> {
  public beginsWith(value: ConditionValue<T, V>): BeginsWith<T, V> {
    return new BeginsWith(this, value);
  }

  public contains(value: ConditionValue<T, V>): Contains<T, V> {
    return new Contains(this, this.type, value);
  }
}
