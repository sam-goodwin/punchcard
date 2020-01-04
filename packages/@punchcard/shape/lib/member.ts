import { ClassModel, ClassShape, ClassType } from './class';
import { ModelMetadata } from './metadata';
import { Shape } from './shape';
import { AssertIsKey } from './util';

/**
 * Represents a Member of a model defined with a Class.
 */
export class Member<T extends Shape = any, Name extends Member.Name = any> {
  constructor(
    public readonly Name: Name,
    public readonly Type: T,
    public readonly Metadata: ModelMetadata = {}) {}
}
export namespace Member {
  /**
   * TODO: Should we limit this to string?
   */
  export type Name = string | number | symbol;

  /**
   * Construct new Member type for a property on a ClassType.
   */
  export type Of<T extends ClassType, K extends keyof ClassModel<T>> =
    ClassModel<T>[K] extends ClassType ? Member<ClassShape<ClassModel<T>[K]>, AssertIsKey<ClassShape<ClassModel<T>[K]>, K>> :

    ClassModel<T>[K] extends Shape ? Member<ClassModel<T>[K], K> :
    never;
}
