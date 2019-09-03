import dynamodb = require('@aws-cdk/aws-dynamodb');
import { Kind } from '../shape/kind';
import { Attributes } from './table';

export type Key<A extends Attributes, P extends keyof A, S extends keyof A | undefined> =
  S extends undefined ? HashKey<A, P> : CompositeKey<A, P, S extends keyof A ? S : never>;

export type HashKey<A extends Attributes, P extends keyof A> = {
  [K in P]: A[K];
};

export type CompositeKey<A extends Attributes, P extends keyof A, S extends keyof A> =
  { [K in P]: A[K] } &
  { [K in S]: A[K] };

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
