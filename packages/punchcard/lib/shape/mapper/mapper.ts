import { RuntimeType } from '../shape';
import { Type } from '../types';

export interface Mapper<De, Ser> {
  read(raw: Ser): De;
  write(record: De): Ser;
}

export interface Reader<Ser> {
  read<T extends Type<any>>(type: T, value: Ser): RuntimeType<T>;
}

export interface Writer<Ser> {
  write<T extends Type<any>>(type: T, value: RuntimeType<T>): Ser
}
