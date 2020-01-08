import { KeysOfType } from 'typelevel-ts';
import { Member } from './member';
import { Shape } from './shape';

/**
 * Assert if a type is a Shape.
 */
export type AssertIsShape<T, C extends Shape = Shape> = T extends C ? T : never;

export type AssertIsKey<T, K> = K extends keyof T ? K : never;

export type AssertIsMember<T> = T extends Member ? T : never;

export type Compact<A> = { [K in keyof A]: A[K] };

export type OptionalKeys<T extends object> = KeysOfType<T, Member<any, any, { nullable: true }>>;

export type RequiredKeys<T extends object> = Exclude<keyof T, OptionalKeys<T>>;

/**
 * Derive a union type into a union, e.g. 1 | 2 => [1, 2]
 *
 * This might not be a stable operation to perform in the compiler, but it makes for nice JSON schemas (required properties).
 *
 * @see https://github.com/microsoft/TypeScript/issues/13298#issuecomment-544107351
 */
export type TupleFromUnion<Union> = TupleFromUnionRec<Union, []>['result'];
type TuplePrepend<Tuple extends any[], NewElement> =
    ((h: NewElement, ...t: Tuple) => any) extends ((...r: infer ResultTuple) => any) ? ResultTuple : never;

type Consumer<Value> = (value: Value) => void;

type IntersectionFromUnion<Union> =
    (Union extends any ? Consumer<Union> : never) extends (Consumer<infer ResultIntersection>)
    ? ResultIntersection
    : never;

type OverloadedConsumerFromUnion<Union> = IntersectionFromUnion<Union extends any ? Consumer<Union> : never>;

type UnionLast<Union> = OverloadedConsumerFromUnion<Union> extends ((a: infer A) => void) ? A : never;

type UnionExcludingLast<Union> = Exclude<Union, UnionLast<Union>>;

type TupleFromUnionRec<RemainingUnion, CurrentTuple extends any[]> =
    [RemainingUnion] extends [never]
    ? { result: CurrentTuple }
    : { result: TupleFromUnionRec<UnionExcludingLast<RemainingUnion>, TuplePrepend<CurrentTuple, UnionLast<RemainingUnion>>>['result'] };
