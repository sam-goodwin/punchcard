import { Shape } from './shape';

/**
 * Assert if a type is a Shape.
 */
export type AssertIsShape<T> = T extends Shape ? T : never;

export type AssertIsKey<T, K> = K extends keyof T ? K : never;