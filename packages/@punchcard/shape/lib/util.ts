import { Decorated, Metadata } from './metadata';
import { Shape } from './shape';

import { KeysOfType } from 'typelevel-ts';

/**
 * Helper for extending static interfaces.
 *
 * ```ts
 * const a = 'a';
 * interface A extends Static<typeof a> {}
 * ```
 */
export type Static<T> = T;

export type ArrayToTuple<A extends any[]> = A[keyof A];
export type AssertIsKey<T, K> = K extends keyof T ? K : never;
export type AssertIsMetadata<T> = T extends Metadata ? T : never;
export type AssertIsShape<T, C extends Shape = Shape> = T extends C ? T : never;
export type OptionalKeys<T extends object> = KeysOfType<T, Decorated<any, { nullable: true }>>;
export type RequiredKeys<T extends object> = Exclude<keyof T, OptionalKeys<T>>;
