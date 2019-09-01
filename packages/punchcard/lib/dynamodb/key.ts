import dynamodb = require('@aws-cdk/aws-dynamodb');
import { Kind } from '../shape/kind';
import { StructShape } from '../shape/struct';

export type Key<S extends StructShape<any>, PKey extends keyof S['shape'], SKey extends keyof S['shape'] | undefined> =
  SKey extends undefined ? HashKey<S, PKey> : CompositeKey<S, PKey, SKey extends keyof S['shape'] ? SKey : never>;

export type HashKey<T extends StructShape<any>, PKey extends keyof T['shape']> = StructShape<{
  [K in PKey]: T['shape'][K];
}>;
export type CompositeKey<T extends StructShape<any>, PKey extends keyof T['shape'], SKey extends keyof T['shape']> = StructShape<
  { [K in PKey]: T['shape'][K] } &
  { [K in SKey]: T['shape'][K] }
>;
export function keyType(kind: Kind): dynamodb.AttributeType {
  switch (kind) {
    case Kind.String:
    return dynamodb.AttributeType.STRING;
    case Kind.Timestamp:
    case Kind.Number:
    case Kind.Integer:
      return dynamodb.AttributeType.NUMBER;
    case Kind.Binary:
      return dynamodb.AttributeType.BINARY;
    default:
      throw new Error(`key Kind must be String, Number or Integer, got ${kind}`);
  }
}
