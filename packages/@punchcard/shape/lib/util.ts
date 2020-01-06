import { Member } from './member';
import { Shape } from './shape';

/**
 * Assert if a type is a Shape.
 */
export type AssertIsShape<T> = T extends Shape ? T : never;

export type AssertIsKey<T, K> = K extends keyof T ? K : never;

export type AssertIsMember<T> = T extends Member ? T : never;

export type Compact<A> = { [K in keyof A]: A[K] };