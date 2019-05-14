import { Type } from '../types';

export interface Mapper<De, Ser> {
  read(raw: Ser): De;
  write(record: De): Ser;
}

export interface Reader<Ser> {
  read<T extends Type<V>, V>(type: T, value: Ser): V;
}

export interface Writer<Ser> {
  write<T extends Type<V>, V>(type: T, value: V): Ser
}
