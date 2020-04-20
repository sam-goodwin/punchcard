import { Metadata } from './metadata';
import { IsOptional } from './option';
import { RecordMembers } from './record';
import { Shape } from './shape';

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
export type OptionalKeys<T extends RecordMembers> = Exclude<{
  [k in keyof T]: IsOptional<T[k]> extends true ? k : undefined;
}[keyof T], undefined>;
export type RequiredKeys<T extends RecordMembers> = Exclude<keyof T, OptionalKeys<T>>;
