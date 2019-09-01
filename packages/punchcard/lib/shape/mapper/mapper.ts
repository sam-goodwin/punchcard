import { RuntimeShape, Shape } from '../shape';

export interface Mapper<De, Ser> {
  read(raw: Ser): De;
  write(record: De): Ser;
}

export interface Reader<Ser> {
  read<T extends Shape<any>>(type: T, value: Ser): RuntimeShape<T>;
}

export interface Writer<Ser> {
  write<T extends Shape<any>>(type: T, value: RuntimeShape<T>): Ser
}
