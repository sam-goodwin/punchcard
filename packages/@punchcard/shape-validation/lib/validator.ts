export interface ValidationErrors extends Array<Error> {}

export interface Validator<T> {
  validate(value: T): ValidationErrors | void;
}
