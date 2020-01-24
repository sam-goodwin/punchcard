import { ShapeOrRecord } from './class';
import { Trait } from './metadata';
import { Shape } from './shape';

/**
 * Optional Trait metadata. Marks a shape as `{ nullable: true }`.
 *
 * TODO: should Optional be exposed a Shape instead of a Trait, i.e. `OptionalShape<T>`?
 */
export const Optional: Trait<any, { nullable: true }> = {
  [Trait.Data]: {
    nullable: true
  }
};

/**
 * Helper for constructing Optional shapes.
 *
 * Decorates the Shape with the Optional trait.
 *
 * @param shapeOrRecord a Shape or a Record to transform as optional
 */
export function optional<T extends ShapeOrRecord>(shapeOrRecord: T) {
  return Shape.of(shapeOrRecord).apply(Optional);
}

export function Description<D extends string>(description: D): Trait<any, { description: D }> {
  return {
    [Trait.Data]: {
      description
    }
  };
}
