import { ShapeGuards } from './guards';
import { Member } from './member';
import { getClassMetadata, getPropertyMetadata, Metadata } from './metadata';
import { Shape } from './shape';

// augment shape to avoid circular dependency
declare module './shape' {
  namespace Shape {
    export function of<T extends Shape | ClassType>(items: T): Shape.Of<T>;
  }
}
Shape.of = <T extends Shape | ClassType>(items: T, noCache: boolean = false): Shape.Of<T> => (ShapeGuards.isShape(items) ? items : ClassShape.ofType(items as ClassType, noCache)) as Shape.Of<T>;

/**
 * A Shape derived from a TypeScript `class`.
 *
 * Classes are used to model complex types.
 *
 * E.g.
 * ```
 * class MyClass {
 *   key = string;
 *   nested = Nested;
 *   recursive = MyClass;
 * }
 * class Nested {
 *   count = integer;
 * }
 * ```
 */
export class ClassShape<C extends ClassType> extends Shape {
  public static ofType<C extends ClassType>(clazz: C, noCache: boolean = false): ClassShape<C> {
    if (noCache) {
      return make();
    }
    if (!cache().has(clazz)) {
      cache().set(clazz, make());
    }
    return cache().get(clazz);

    function make() {
      const members: any = {};
      const type = new (clazz)();
      for (const [name, property] of Object.entries(type)) {
        let shape: Shape;
        if (ShapeGuards.isShape(property)) {
          shape = property;
        } else {
          shape = ClassShape.of(property as any) as any;
        }
        members[name] = new Member(name, shape!, getPropertyMetadata(clazz.prototype, name));
      }
      return new ClassShape(clazz, members, getClassMetadata(clazz));
    }
  }

  public readonly Kind = 'classShape';

  constructor(
    /**
     * This Shape's Class handle.
     */
    public readonly Class: C,

    /**
     * Members of the Class.
     */
    public readonly Members: {
      [property in keyof ClassModel<C>]: Member.Of<C, property>;
    },

    public readonly Metadata: Metadata = {}
  ) {
    super();
  }

  public getMetadata(): any[] {
    return Object.values(this.Metadata);
  }
}

/**
 * A handle to a class type (the RHS of a new expression, e.g. `new RHS()`).
 *
 * ```ts
 * const a = class MyClass {}
 * typeof a; // Class<MyClass>;
 * ```
 */
export type ClassType<T = any> = new () => T;

export type ClassModel<C extends ClassType> = C extends ClassType<infer T> ? T : never;

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
