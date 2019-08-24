import { OptionalType, Type } from './types';

export type Shape = {
  [ key: string ]: Type<any>;
};

export type RuntimeType<T> = T extends Type<infer V> ? V : never;

type OptionalKeys<T extends Shape> =
    Pick<T, { [K in keyof T]: T[K] extends OptionalType<any> ? K : never; }[keyof T]>;

type MandatoryKeys<T extends Shape> =
    Pick<T, { [K in keyof T]: T[K] extends OptionalType<any> ? never: K; }[keyof T]>;

export type RuntimeShape<T extends Shape> =
    { [K in keyof MandatoryKeys<T>]-?: RuntimeType<T[K]>; } &
    { [K in keyof OptionalKeys<T>]+?: RuntimeType<T[K]>; };
