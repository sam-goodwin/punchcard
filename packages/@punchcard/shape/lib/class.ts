import { ShapeGuards } from './guards';
import { Member, Members } from './member';
import { Meta, Metadata } from './metadata';
import { Shape } from './shape';
import { RequiredKeys } from './util';
import { Value } from './value';

export interface ClassMembers {
  [member: string]: ShapeOrRecord;
}

/**
 * A Shape derived from a TypeScript `class`.
 *
 * Classes are used to model complex types.
 *
 * E.g.
 * ```
 * class Nested extends Record({
 *   count: integer
 * }) {}
 * Nested.shape; // ClassShape<{count: IntegerShape}>
 *
 * class MyClass extends Record({
 *   key: string,
 *   nested: Nested
 * }) {}
 * MyClass.shape; // ClassShape<{key: StringShape, nested: ClassShape<{count: IntegerShape}>}>
 * ```
 *
 * @typeparam M class members (key-value pairs of shapes)
 * @typeparam I type of instance of this struct (the value type)
 */
export class ClassShape<M extends ClassMembers, I = any> extends Shape {
  public readonly Kind = 'classShape';

  public readonly Members: Members<M> = {} as any;

  public readonly [Value.Tag]: I;

  constructor(public readonly type: ClassType<I, M>, public readonly Metadata: Metadata) {
    super();
    for (const [name, shape] of Object.entries(type[ClassShape.Members])) {
      (this.Members as any)[name] = new Member(name, Shape.of(shape), Meta.get(shape));
    }
  }

  public getMetadata(): any[] {
    return Object.values(this.Metadata);
  }
}
export namespace ClassShape {
  export type Members = typeof Members;
  export const Members = Symbol.for('@punchcard/shape.ClassShape.Members');
}

/**
 * A handle to a class type (the RHS of a new expression, e.g. `new RHS()`).
 *
 * ```ts
 * const a = class MyClass {}
 * typeof a; // ClassType<MyClass>;
 * ```
 */
export type ClassType<I = any, M extends ClassMembers = any> =
  (new (...args: any[]) => I) & {
    [ClassShape.Members]: M;
  };

export type ShapeOrRecord = Shape | ClassType;

/**
 * Maps ClassMembers to a structure that represents it at runtime.
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
 * })
 *
 * new A({
 *   a: 'a'; // <- the above "Inline documentation" docs are preserved, traced back to the source.
 * }).a; // <- same here
 * ```
 */
export type RecordMembers<T extends ClassMembers> = {
  /**
   * Write each member and their documentation to the structure.
   * Write them all as '?' for now.
   */
  [M in keyof T]+?: Value.Of<T[M]>;
} & {
  /**
   * Remove '?' from required properties.
   */
  [M in RequiredKeys<T>]-?: Value.Of<T[M]>;
};

export type RecordInstance<T extends ClassMembers> = RecordMembers<T> & {
  /**
   * Instance reference to this record's members.
   *
   * Hide it with a symbol so we don't clash with the members.
   */
  [ClassShape.Members]: {
    [M in keyof T]: Shape.Of<T[M]>;
  };
};

export type RecordType<T extends ClassMembers = any> = {
  /**
   * Static reference to this record's members.
   */
  readonly [ClassShape.Members]: {
    [M in keyof T]: Shape.Of<T[M]>;
  };
  /**
   * Constructor takes values for each member.
   */
} & (new (values: RecordMembers<T>) => RecordInstance<T>);

export function Record<T extends ClassMembers>(members: T): RecordType<T> {
  const memberShapes: any = Object.entries(members).map(([name, member]) => ({
    [name]: Shape.of(member)
  })).reduce((a, b) => ({...a, ...b}));

  class NewType {
    public static readonly [ClassShape.Members] = memberShapes;

    public readonly [ClassShape.Members]: T = memberShapes;

    constructor(values: {
      [K in keyof T]: Value.Of<T[K]>;
    }) {
      for (const [name, value] of Object.entries(values)) {
        (this as any)[name] = value;
      }
    }
  }
  return NewType as any;
}

// augment to avoid circular dependency
declare module './shape' {
  namespace Shape {
    function of<T extends ShapeOrRecord>(t: T): Shape.Of<T>;
  }
}
Shape.of = <T extends ShapeOrRecord>(t: T, noCache: boolean = false): Shape.Of<T> => {
  if (ShapeGuards.isShape(t)) {
    return t as any;
  }
  if (noCache) {
    return make();
  }
  if (!cache().has(t)) {
    cache().set(t, make());
  }
  return cache().get(t);

  function make() {
    return new ClassShape(t as any, Meta.get(t)) as any;
  }
};

/**
 * Global cache of all derived classes.
 */
function cache() {
  const glob = global as any;
  if (glob[_cache] === undefined) {
    glob[_cache] = new WeakMap();
  }
  return glob[_cache];
}

const _cache = Symbol.for('punchcard.shape.cache');