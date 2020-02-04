import { Apply, Trait } from './metadata';
import { RecordType } from './record';
import { Shape } from './shape';

/**
 * Optional Trait metadata. Marks a shape as `{ nullable: true }`.
 *
 * TODO: should Optional be exposed a Shape instead of a Trait, i.e. `OptionalShape<T>`?
 */
export const Optional: Trait<any, IsOptional> = {
  [Trait.Data]: {
    nullable: true
  }
};
export type IsOptional = {
  nullable: true
};

/**
 * Helper for constructing Optional shapes.
 *
 * Decorates the Shape with the Optional trait.
 *
 * @param shapeOrRecord a Shape or a Record to transform as optional
 */
export function optional<T extends Shape>(shape: T): Apply<T, IsOptional>;
export function optional<T extends RecordType>(type: T): Apply<Shape.Of<T>, IsOptional>;
export function optional(shapeOrRecord: any): any {
  return Shape.of(shapeOrRecord).apply(Optional);
}

export function Description<D extends string>(description: D): Trait<any, { description: D }> {
  return {
    [Trait.Data]: {
      description
    }
  };
}
