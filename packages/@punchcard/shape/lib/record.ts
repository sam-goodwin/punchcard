import { ShapeGuards } from './guards';
import { Member, Members } from './member';
import { Meta, Metadata } from './metadata';
import { Shape } from './shape';
import { RequiredKeys } from './util';
import { Value } from './value';

export interface RecordMembers {
  [member: string]: ShapeOrRecord;
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
 * MyClass.shape; // {key: StringShape, nested: ClassShape<{count: IntegerShape}, Nested>}
 * ```
 *
 * @typeparam M record members (key-value pairs of shapes)
 * @typeparam I instance type of this Record (the value type)
 */
export class RecordShape<M extends RecordMembers, I = any> extends Shape {
  public readonly Kind: 'recordShape' = 'recordShape';

  public readonly Members: Members<M> = {} as any;

  public readonly [Value.Tag]: I;

  constructor(public readonly Type: RecordType<I, M>, public readonly Metadata: Metadata) {
    super();
    for (const [name, shape] of Object.entries(Type[RecordShape.Members])) {
      (this.Members as any)[name] = new Member(name, Shape.of(shape), Meta.get(shape));
    }
  }

  public getMetadata(): any[] {
    return Object.values(this.Metadata);
  }
}
export namespace RecordShape {
  export type Members = typeof Members;
  export const Members = Symbol.for('@punchcard/shape.ClassShape.Members');
}

/**
 * A handle to a Record type (the RHS of a new expression, e.g. `new RHS()`).
 *
 * ```ts
 * const a = class MyClass {}
 * typeof a; // RecordType<MyClass>;
 * ```
 */
export type RecordType<I = any, M extends RecordMembers = any> =
  (new (...args: any[]) => I) & {
    [RecordShape.Members]: M;
  };

export type ShapeOrRecord = Shape | RecordType;

export type ShapeOrRecordWithValue<T> = (Shape & { [Value.Tag]: T; }) | RecordType<T>;

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
type MakeRecordMembers<T extends RecordMembers> = {
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

type MakeRecordInstance<T extends RecordMembers> = MakeRecordMembers<T> & {
  /**
   * Instance reference to this record's members.
   *
   * Hide it with a symbol so we don't clash with the members.
   */
  [RecordShape.Members]: {
    [M in keyof T]: Shape.Of<T[M]>;
  };
};

export type MakeRecordType<T extends RecordMembers = any> = {
  /**
   * Static reference to this record's members.
   */
  readonly [RecordShape.Members]: {
    [M in keyof T]: Shape.Of<T[M]>;
  };
  /**
   * Constructor takes values for each member.
   */
} & (new (values: MakeRecordMembers<T>) => MakeRecordInstance<T>);

/**
 * Dynamically constructs a class using a map of member names to shapes.
 *
 * class A extends Record({
 *   /**
 *    * Inline documentation.
 *    *\/
 *   a: string
 * }) {}
 * A
 *
 * @param members key-value pairs of members and their shape (type).
 */
export function Record<T extends RecordMembers>(members: T): MakeRecordType<T> {
  const memberShapes: any = Object.entries(members).map(([name, member]) => ({
    [name]: Shape.of(member)
  })).reduce((a, b) => ({...a, ...b}));

  class NewType {
    /**
     * This Record type's members and their shape.
     */
    public static readonly [RecordShape.Members] = memberShapes;
    /**
     * This Record type's members and their shape.
     */
    public static readonly members = memberShapes;

    /**
     * This instance's members - useful for reflection.
     */
    public readonly [RecordShape.Members]: T = memberShapes;

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
    return new RecordShape(t as any, Meta.get(t)) as any;
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