export interface Mapper<T, U> {
  read(value: U): T;
  write(value: T): U;
}
