import { RecordType, ShapeOrRecord } from '@punchcard/shape';
import { Query } from './query';
import { Postgresql, Rep } from './representation';
import { Table } from './table';

export type SQL<T> = Generator<unknown, T>;

export function sql<A extends Array<Rep | Table<any, any, any>>>(template: TemplateStringsArray, ...args: A): Sql {
  return new Sql(template)
}

export class Sql {
  constructor(public readonly sql: string) {}

  public as<F extends { [fieldName: string]: ShapeOrRecord; }>(fields: F): Query.Select<{
    [fieldName in keyof F]: Postgresql.Rep<F[fieldName]>;
  }>;
  public as<T extends RecordType>(type: T): Query.Select<Postgresql.Fields<T>>;

  public as(as: any): any {}
}