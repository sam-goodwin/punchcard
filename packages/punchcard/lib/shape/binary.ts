import { DynamoPath } from '../dynamodb/expression/path';
import { Kind } from './kind';
import { PrimitiveShape } from './primitive';
import { StringDynamoPath } from './string';

export interface BinaryShapeConstraints {
  minLength?: number;
  maxLength?: number;
}
/**
 * https://json-schema.org/latest/json-schema-validation.html#rfc.section.8
 */
export class BinaryShape extends PrimitiveShape<Buffer> {
  constructor(private readonly constraints: BinaryShapeConstraints = {}) {
    super(Kind.Binary);
  }

  public toDynamoPath(parent: DynamoPath, name: string): StringDynamoPath<this> {
    return new StringDynamoPath(parent, name, this);
  }

  public toJsonSchema(): object {
    const schema: any = {
      type: 'string',
      ...this.constraints,
      contentEncoding: 'base64'
    };
    return schema;
  }

  public toGlueType() {
    return {
      inputString: 'binary',
      isPrimitive: true
    };
  }

  public validate(value: Buffer): void {
    const len = value.length;
    if (this.constraints) {
      if (this.constraints.minLength !== undefined && len < this.constraints.minLength) {
        throw new Error(`string length of ${len} is less than minimum ${this.constraints.minLength}`);
      }
      if (this.constraints.maxLength !== undefined && len > this.constraints.maxLength) {
        throw new Error(`string length of ${len} exceeds maximum ${this.constraints.minLength}`);
      }
    }
  }

  public hashCode(value: Buffer): number {
    return hashCode(value);
  }
}

function hashCode(value: Buffer): number {
  let hash = 0;
  for (const byte of value) {
// tslint:disable: no-bitwise
    hash = ((hash << 5) - hash) + byte;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

const standardBinary = new BinaryShape();
export function binary(constraints?: BinaryShapeConstraints) {
  if (constraints) {
    return new BinaryShape(constraints);
  } else {
    return standardBinary;
  }
}
