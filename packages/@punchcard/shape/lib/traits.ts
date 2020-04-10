import { Apply, Decorated, Trait } from './metadata';
import { Shape } from './shape';

/**
 * Optional Trait metadata. Marks a shape as `{ nullable: true }`.
 *
 * TODO: should Optional be exposed a Shape instead of a Trait, i.e. `OptionalShape<T>`?
 */
export const Optional: Trait<Shape, IsOptional> = {
  [Trait.Data]: {
    nullable: true
  }
};
export type IsOptional = {
  nullable: true
};
export function isOptional(a: any) {
  return a[Decorated.Data] && a[Decorated.Data].nullable === true;
}

/**
 * Helper for constructing Optional shapes.
 *
 * Decorates the Shape with the Optional trait.
 *
 * @param shapeOrRecord a Shape or a Record to transform as optional
 */
export function optional<T extends Shape>(shape: T): Apply<T, IsOptional> {
  // shape.apply(Optional);
  return shape.apply(Optional as any);
}

export function Description<D extends string>(description: D): Trait<any, { description: D }> {
  return {
    [Trait.Data]: {
      description
    }
  };
}
