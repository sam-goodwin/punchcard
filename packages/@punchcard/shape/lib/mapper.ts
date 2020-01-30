import { ShapeOrRecord } from './class';
import { Value } from './value';

/**
 * Maps a `T` to/from a `U`.
 */
export interface Mapper<T, U> {
  read(value: U): T;
  write(value: T): U;
}

/**
 * Creates a Mapper to serialize a shape to/from some serialization format, `Ser`.
 */
export type MapperFactory<Ser> = <T extends ShapeOrRecord>(shapeOrRecord: T) => Mapper<Value.Of<T>, Ser>;
