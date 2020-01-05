export interface ValidationErrors extends Array<Error> {}

export type Validator<T> = (value: T) => ValidationErrors | void;

export interface ValidationMetadata<T> {
  validator: Array<Validator<T>>;
}

export function Validator<T>(validator: Validator<T>): ValidationMetadata<T> {
  return {
    validator: [validator]
  };
}
