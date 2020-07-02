import { Metadata } from './metadata';
import { IsOptional } from './option';
import { Shape } from './shape';
import { Fields } from './type';

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
export type OptionalKeys<T extends Fields> = Exclude<{
  [k in keyof T]: IsOptional<T[k]> extends true ? k : undefined;
}[keyof T], undefined>;
export type RequiredKeys<T extends Fields> = Exclude<keyof T, OptionalKeys<T>>;

export function stringHashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const character = value.charCodeAt(i);
    // tslint:disable: no-bitwise
    hash = ((hash << 5) - hash) + character;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}