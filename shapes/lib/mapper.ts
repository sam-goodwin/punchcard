import { Shape } from './shape';
import { Validator } from './validation';
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
export type MapperFactory<Ser> = <T extends Shape>(shapeOrRecord: T) => Mapper<Value.Of<T>, Ser>;

export class ValidatingMapper<T extends Shape, U> implements Mapper<Value.Of<T>, U> {
  public static of<T extends Shape, U>(shape: T, mapper: Mapper<Value.Of<T>, U>) {
    return new ValidatingMapper(mapper, Validator.of(shape));
  }

  constructor(private readonly mapper: Mapper<Value.Of<T>, U>, private readonly validator: Validator<T>) {}

  public read(value: U): Value.Of<T> {
    return this.assertIsValid(this.mapper.read(value));
  }

  public write(value: Value.Of<T>): U {
    return this.mapper.write(this.assertIsValid(value));
  }

  private assertIsValid(value: Value.Of<T>): Value.Of<T> {
    const errors = this.validator(value, '$');
    if (errors.length > 0) {
      throw new Error(errors.map(e => e.message).join('\n'));
    }
    return value;
  }
}
