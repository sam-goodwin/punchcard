import { Shape } from '@punchcard/shape';
import { Value } from './value';

export interface Mapper<T extends Shape, U> {
  read(value: U): Value.Of<T>;
  write(value: Value.Of<T>): U;
}
