import { Metadata } from './metadata';
import { Pointer } from './pointer';
import { Shape } from './shape';
import { RequiredKeys } from './util';
import { Value } from './value';

import { Compact, RowLacks } from 'typelevel-ts';

export type Fields = Readonly<{
  [member: string]: Shape;
}>;
export namespace Fields {
  /**
   * Computes a natural representation of the members by applying `+?` to `optional` fields.
   */
  export type Natural<M extends Fields> = {
    /**
     * Write each member and their documentation to the structure.
     * Write them all as '?' for now.
     */
    [m in keyof M]+?: Pointer.Resolve<M[m]>;
  } & {
    /**
     * Remove '?' from required properties.
     */
    [m in RequiredKeys<M>]-?: Pointer.Resolve<M[m]>;
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
export class RecordShape<M extends Fields = Fields, FQN extends string | undefined = string | undefined> extends Shape {
  public readonly Kind: 'recordShape' = 'recordShape';

  /**
   * Globally unique identifier of this record type.
   */
  public readonly FQN: FQN;

  [key: string]: any;

  constructor(
    public readonly Members: Readonly<M>,
    public readonly Metadata: Metadata,
    FQN?: FQN,
  ) {
    super();
    this.FQN = FQN!;
  }

  public getMetadata(): any[] {
    return Object.values(this.Metadata);
  }
}
export namespace RecordShape {
  export type GetMembers<T extends RecordShape<any>> = T extends RecordShape<infer M> ? M : never;
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
export type RecordValues<M extends Fields> = {
  /**
   * Write each member and their documentation to the structure.
   * Write them all as '?' for now.
   */
  [m in keyof M]+?: Value.Of<Pointer.Resolve<M[m]>>;
} & {
  /**
   * Remove '?' from required properties.
   */
  [m in RequiredKeys<M>]-?: Value.Of<Pointer.Resolve<M[m]>>;
};

export interface RecordType<M extends Fields = Fields, FQN extends string | undefined = string | undefined> extends RecordShape<M, FQN> {
  /**
   * Constructor takes values for each member.
   */
  new (values: {
    // compact RecordValue<T> by enumerating its keys
    // produces a cleaner interface instead of `{a: string} & {}`
    [m in keyof RecordValues<M>]: RecordValues<M>[m];
  }): {
    [m in keyof RecordValues<M>]: RecordValues<M>[m];
  };

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
  Extend<M2 extends Fields>(members: RowLacks<M2, keyof M>): Extend<M, undefined, M2>;
  Extend<FQN2 extends string, M2 extends Fields>(fqn: FQN2, members: RowLacks<M2, keyof M>): Extend<M, FQN2, M2>;

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
   * class B extends A.Pick(['b']) {}
   * B.members.b;
   * B.members.a; // <- compile-time error
   * ```
   *
   * @param members array of members to select
   */
  Pick<M2 extends (keyof M)[]>(members: M2): PickRecord<M, undefined, M2>;
  Pick<FQN2 extends string, M2 extends (keyof M)[]>(fqn: FQN2, members: M2): PickRecord<M, FQN2, M2>;

  /**
   * Omit members from a `Record` to create a new `RecordType`.
   *
   * Example:
   * ```ts
   * class A extends Record({
   *   a: string,
   *   b: string
   * }) {}
   *
   * class B extends A.Omit(['a']) {}
   * B.members.b;
   * B.members.a; // <- compile-time error
   * ```
   *
   * @param members array of members to select
   */
  Omit<M2 extends (keyof M)[]>(members: M2): OmitRecord<M, undefined, M2>;
  Omit<FQN2 extends string, M2 extends (keyof M)[]>(fqn: FQN2, members: M2): OmitRecord<M, FQN2, M2>;
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
// export function Record<T extends RecordMembers = any>(members: T): RecordType<T>;
export function Record<FQN extends string, T extends Fields = any>(members: T): RecordType<T, undefined>;
export function Record<FQN extends string, T extends Fields = any>(fqn: FQN, members: T): RecordType<T, FQN>;

export function Record<T extends Fields>(a: any, b?: any) {
  const FQN = typeof a === 'string' ? a : undefined;
  const members = typeof b === 'undefined' ? a : b;
// export function Record<T extends RecordMembers = any>(members: T): RecordType<T> {
  class NewType {
    public static readonly FQN: string | undefined = FQN;

    public static Extend<FQN extends string, M extends Fields>(
      a: FQN | RowLacks<M, keyof T>,
      b?: RowLacks<M, keyof T>
    ): Extend<T, FQN, M> {
      return Extend(this as any, typeof a === 'string' ? a : undefined, typeof a === 'string' ? b! : a) as any;
    }

    public static Pick<FQN extends string, M extends (keyof T)[]>(
      a: FQN | RowLacks<M, keyof T>,
      b?: RowLacks<M, keyof T>
    ): PickRecord<T, FQN, M> {
      return Pick(
        members,
        typeof a === 'string' ? a : undefined,
        typeof a === 'string' ? b! : a
      ) as any;
    }

    public static Omit<FQN extends string, M extends (keyof T)[]>(
      a: FQN | RowLacks<M, keyof T>,
      b?: RowLacks<M, keyof T>
    ): OmitRecord<T, FQN, M> {
      return Omit(
        members,
        typeof a === 'string' ? a : undefined,
        typeof a === 'string' ? b! : a
      ) as any;
    }

    constructor(values: {
      [K in keyof T]: Value.Of<Pointer.Resolve<T[K]>>;
    }) {
      for (const [name, value] of Object.entries(values)) {
        (this as any)[name] = value;
      }
    }
  }

  const shape = new RecordShape<T, any>(members, {}, FQN);
  Object.assign(NewType, shape);
  (NewType as any).equals = shape.equals.bind(NewType);
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
export function Extend<
  T extends RecordType,
  FQN extends string | undefined,
  M extends Fields
>(
  type: T,
  fqn: FQN,
  members: RowLacks<M, keyof T['Members']>
): Extend<T['Members'], FQN, M> {
  return Record(fqn!, {
    ...type.Members,
    ...members
  }) as any;
}

/**
 * Combine two sets of Members into a single `RecordType`.
 */
export type Extend<T extends Fields, FQN extends string | undefined, M extends Fields> = RecordType<Compact<T & M>, FQN>;


/**
 * Picks members from a `Record` to create a new `RecordType`.
 */
export type PickRecord<T extends Fields, FQN extends string | undefined, K extends (keyof T)[] | ReadonlyArray<keyof T>> =
  RecordType<
    Pick<T, Extract<K[keyof K], string>>,
    FQN
  >;

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
 * @param fields to select from
 * @param select array of members to select
 */
export function Pick<T extends Fields, FQN extends string | undefined, M extends (keyof T)[]>(
  fields: T,
  fqn: FQN,
  select: M
): PickRecord<T, FQN, M> {
  const members: any = {};
  for (const key of select) {
    members[key] = fields[key];
    if (members[key] === undefined) {
      throw new Error(`attempted to select non-existent member: ${key}`);
    }
  }
  return Record(fqn!, members) as any;
}

/**
 * Omits members from a `Record` to create a new `RecordType`
 */
export type OmitRecord<T extends Fields, FQN extends string | undefined, K extends (keyof T)[]> =
  RecordType<
    Omit<T, Extract<K[keyof K], string>>,
    FQN
  >;

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
 * @param fields to select from
 * @param select array of members to select
 */
export function Omit<T extends Fields, FQN extends string | undefined, M extends (keyof T)[]>(
  fields: T,
  fqn: FQN,
  select: M
): OmitRecord<T, FQN, M> {
  const members: any = {};
  for (const key of Object.keys(fields).filter(f => select.find(s => f === s))) {
    members[key] = fields[key];
    if (members[key] === undefined) {
      throw new Error(`attempted to select non-existent member: ${key}`);
    }
  }
  return Record(fqn!, members) as any;
}
