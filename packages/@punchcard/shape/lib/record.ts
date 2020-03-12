import { Metadata } from './metadata';
import { Shape } from './shape';
import { ArrayToTuple, AssertIsKey, RequiredKeys } from './util';
import { Value } from './value';

import { Compact, RowLacks } from 'typelevel-ts';

export interface RecordMembers {
  [member: string]: Shape;
}
export namespace RecordMembers {
  /**
   * Computes a natural representation of the members by applying `+?` to `optional` fields.
   */
  export type Natural<M extends RecordMembers> = {
    /**
     * Write each member and their documentation to the structure.
     * Write them all as '?' for now.
     */
    [m in keyof M]+?: M[m];
  } & {
    /**
     * Remove '?' from required properties.
     */
    [m in RequiredKeys<M>]-?: M[m];
  };
}

/**
 * RecordShapes are used to model complex types of named members.
 *
 * E.g.
 * ```
 * class Nested extends Record({
 *   count: integer
 * }) {}
 * Nested.members; // {count: IntegerShape}
 *
 * class MyClass extends Record({
 *   key: string,
 *   nested: Nested
 * }) {}
 * MyClass.members; // {key: StringShape, nested: ClassShape<{count: IntegerShape}, Nested>}
 * ```
 *
 * @typeparam M record members (key-value pairs of shapes)
 * @typeparam I instance type of this Record (the value type)
 */
export class RecordShape<M extends RecordMembers> extends Shape {
  public readonly Kind: 'recordShape' = 'recordShape';

  constructor(
    public readonly Members: M,
    public readonly Metadata: Metadata
  ) {
    super();
  }

  public getMetadata(): any[] {
    return Object.values(this.Metadata);
  }
}

/**
 * Maps RecordMembers to a structure that represents it at runtime.
 *
 * It supports adding `?` to optional members and maintins developer documentation.
 *
 * E.g.
 * ```ts
 * class A extends Record({
 *   /**
 *    * Inline documentation.
 *    *\/
 *   a: string
 * }) {}
 *
 * new A({
 *   a: 'a'; // <- the above "Inline documentation" docs are preserved, traced back to the source.
 * }).a; // <- same here
 * ```
 */
export type RecordValues<M extends RecordMembers> = {
  /**
   * Write each member and their documentation to the structure.
   * Write them all as '?' for now.
   */
  [m in keyof M]+?: Value.Of<M[m]>;
} & {
  /**
   * Remove '?' from required properties.
   */
  [m in RequiredKeys<M>]-?: Value.Of<M[m]>;
};

export interface RecordType<M extends RecordMembers = any> extends RecordShape<M> {
  /**
   * Constructor takes values for each member.
   */
  new (values: {
    // compact RecordValue<T> by enumerating its keys
    // produces a cleaner interface instead of `{a: string} & {}`
    [m in keyof RecordValues<M>]: RecordValues<M>[m];
  }): RecordValues<M>;

  /**
   * Extend this Record with new members to create a new `RecordType`.
   *
   * Example:
   * ```ts
   * class A extends Record({
   *   a: string,
   *   b: string
   * }) {}
   *
   * class B extends A.Extend({
   *   c: string
   * }) {}
   * ```
   *
   * @param members new Record members
   */
  Extend<M2 extends RecordMembers>(members: RowLacks<M2, keyof M>): Extend<M, M2>;

  /**
   * Pick members from a `Record` to create a new `RecordType`.
   *
   * Example:
   * ```ts
   * class A extends Record({
   *   a: string,
   *   b: string
   * }) {}
   *
   * class B extends A.Pick(['a']) {}
   * B.members.a;
   * B.members.b; // <- compile-time error
   * ```
   *
   * @param members array of members to select
   */
  Pick<M2 extends (keyof M)[]>(members: M2): Pick<M, AssertIsKey<M, ArrayToTuple<M2>>>;
}

/**
 * Dynamically constructs a class using a map of member names to shapes.
 *
 * class A extends Record({
 *   /**
 *    * Inline documentation.
 *    *\/
 *   a: string
 * }) {}
 *
 * @param members key-value pairs of members and their shape (type).
 */
export function Record<T extends RecordMembers = any>(members: T): RecordType<T> {
  class NewType {
    public static Extend<M extends RecordMembers>(members: RowLacks<M, keyof T>): Extend<T, M> {
      return Extend(this as any, members) as any;
    }

    public static Pick<M extends (keyof T)[]>(members: M): Pick<T, AssertIsKey<T, ArrayToTuple<M>>> {
      return Pick(this as any, members);
    }

    constructor(values: {
      [K in keyof T]: Value.Of<T[K]>;
    }) {
      for (const [name, value] of Object.entries(values)) {
        (this as any)[name] = value;
      }
    }
  }

  const shape = new RecordShape<T>(members, {});
  Object.assign(NewType, shape);
  (NewType as any).visit = shape.visit.bind(NewType);
  (NewType as any).apply = shape.apply.bind(NewType);
  (NewType as any).getMetadata = shape.getMetadata.bind(NewType);
  return NewType as any;
}

/**
 * Extend this Record with new members to create a new `RecordType`.
 *
 * Example:
 * ```ts
 * class A extends Record({
 *   a: string,
 *   b: string
 * }) {}
 *
 * class B extends Extend(A, {
 *   c: string
 * }) {}
 * ```
 *
 * You can not override the parent Record's members.
 *
 * ```ts
 * class A extends Extend(A, { a: integer }) {} // compile-time error
 * ```
 *
 * @param members new Record members
 */
export function Extend<T extends RecordType, M extends RecordMembers>(type: T, members: RowLacks<M, keyof T['Members']>): Extend<T['Members'], M> {
  const originalMembers = new Set(Object.keys(type.Members));
  for (const m of Object.keys(members)) {
    if (originalMembers.has(m)) {
      throw new Error(`attempted to override Record's member: ${m}`);
    }
  }
  return Record({
    ...type.Members,
    ...members
  }) as any;
}

/**
 * Combine two sets of Members into a single `RecordType`.
 */
export type Extend<T extends RecordMembers, M extends RecordMembers> = RecordType<Compact<T & M>>;

/**
 * Pick members from a `Record` to create a new `RecordType`.
 *
 * Example:
 * ```ts
 * class A extends Record({
 *   a: string,
 *   b: string
 * }) {}
 *
 * class B extends Pick(A, ['a']) {}
 * B.members.a;
 * B.members.b; // <- compile-time error
 * ```
 *
 * @param type to select from
 * @param select array of members to select
 */
export function Pick<T extends RecordType, P extends (keyof T['Members'])[]>(type: T, select: P): Pick<T['Members'], AssertIsKey<T['Members'], ArrayToTuple<P>>> {
  const members: any = {};
  for (const key of select) {
    members[key] = type.Members[key];
    if (members[key] === undefined) {
      throw new Error(`attempted to select non-existent member: ${key}`);
    }
  }
  return Record(members) as any;
}

/**
 * Picks members from a `Record` to create a new `RecordType`.
 */
export type Pick<T extends RecordMembers, K extends keyof T> = RecordType<{
  [M in K]: T[M];
}>;
