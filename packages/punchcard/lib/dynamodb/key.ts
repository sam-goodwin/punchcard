import dynamodb = require('@aws-cdk/aws-dynamodb');
import { RuntimeShape } from '../shape';
import { Kind } from '../shape/kind';
import { Attributes } from './table';

export type KeyValue<A extends Attributes, P extends keyof A, S extends keyof A | undefined> =
  S extends undefined
    ? P extends keyof A ? RuntimeShape<A[P]> : never
    : [
      P extends keyof A ? RuntimeShape<A[P]> : never,
      S extends keyof A ? RuntimeShape<A[S]> : never
    ];

export type Key<A extends Attributes, P extends keyof A, S extends keyof A | undefined> =
  S extends undefined
    ? HashKey<A, P>
    : CompositeKey<A, P, S extends keyof A ? S : never>;

export type HashKey<A extends Attributes, K extends keyof A> = A[K];

export type CompositeKey<A extends Attributes, P extends keyof A, S extends keyof A> = [A[P], A[S]];

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
