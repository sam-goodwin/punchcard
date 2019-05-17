import dynamodb = require('@aws-cdk/aws-dynamodb');
import { Kind, Shape } from '../shape';

export type HashKey<T extends Shape, PKey extends keyof T> = {
  [K in PKey]: T[K];
};
export type CompositeKey<T extends Shape, PKey extends keyof T, SKey extends keyof T> =
  { [K in PKey]: T[K] } &
  { [K in SKey]: T[K] };

export function keyType(kind: Kind): dynamodb.AttributeType {
  switch (kind) {
    case Kind.String:
    return dynamodb.AttributeType.String;
    case Kind.Timestamp:
    case Kind.Number:
    case Kind.Integer:
      return dynamodb.AttributeType.Number;
    case Kind.Binary:
      return dynamodb.AttributeType.Binary;
    default:
      throw new Error(`key Kind must be String, Number or Integer, got ${kind}`);
  }
}
