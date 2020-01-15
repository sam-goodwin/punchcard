import { Member } from './member';
import { Metadata } from './metadata';
import { Shape } from './shape';

/**
 * Assert if a type is a Shape.
 */
export type AssertIsShape<T, C extends Shape = Shape> = T extends C ? T : never;

export type AssertIsKey<T, K> = K extends keyof T ? K : never;

export type AssertIsMember<T> = T extends Member ? T : never;

export type AssertIsMetadata<T> = T extends Metadata ? T : never;

export type Compact<A> = { [K in keyof A]: A[K] };

export type OptionalKeys<T extends object> = KeysOfType<T, Member<any, any, { nullable: true }>>;

export type RequiredKeys<T extends object> = Exclude<keyof T, OptionalKeys<T>>;

export type KeysOfType<A extends object, B> = { [K in keyof A]-?: A[K] extends B ? K : never }[keyof A];
