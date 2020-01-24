import { ClassMembers} from './class';
import { Meta, Metadata } from './metadata';
import { Shape } from './shape';
import { AssertIsMetadata } from './util';

const isMember = Symbol.for('@punchcard/shape.Member');

/**
 * Represents a Member of a model defined with a Class.
 */
export class Member<T extends Shape = any, Name extends Member.Name = any, M extends Metadata = Metadata> {
  public static isInstance(a: any): a is Member {
    return a[isMember] === true;
  }
  public static assertInstance(a: any): asserts a is Member {
    if (!(Member.isInstance(a)))  {
      throw new Error(`${a} is not of type Member`);
    }
  }

  public [isMember]: true = true;

  constructor(
    public readonly Name: Name,
    public readonly Type: T,
    public readonly Metadata: M) {
  }
}
export namespace Member {
  /**
   * TODO: Should we limit this to string?
   */
  export type Name = string | number | symbol;

  /**
   * Construct new Member type for a property on a ClassType.
   */
  export type Of<T extends ClassMembers, K extends keyof T> =
    Member<Shape.Of<T[K]>, K, AssertIsMetadata<Meta.GetDataOrElse<T[K], {}>>>;
}

export type Members<T extends ClassMembers> = {
  [K in keyof T]: Member.Of<T, K>;
};