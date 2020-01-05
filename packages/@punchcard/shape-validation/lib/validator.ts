import { Runtime } from '@punchcard/shape-runtime';
import { Shape } from '@punchcard/shape/lib/shape';

export interface ValidationErrors extends Array<Error> {}

export type Validator<T> = (value: T) => ValidationErrors | void;

export interface ValidationMetadata<T> {
  validator: Array<Validator<T>>;
}

export function Validator<T extends Shape>(validator: Validator<Runtime.Of<T>>): ValidationMetadata<T> {
  return {
    validator: [validator]
  };
}
