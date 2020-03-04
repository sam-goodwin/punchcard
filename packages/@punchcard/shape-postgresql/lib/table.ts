
import { ArrayShape, AssertIsKey, BoolShape, IntegerShape, MakeRecordType, number, Record, RecordMembers, RecordType, Shape, ShapeOrRecord, string, StringShape, Value } from '@punchcard/shape';
import { Query } from './query';
import { Bool, Postgresql, Rep } from './representation';
import { SQL } from './sql';

export type Field<T extends RecordType> = keyof T['members'];
export type Fields<T extends RecordType> = Array<keyof T['members']>;

enum IndexType {
  BRIN = 'BRIN',
  BTREE = 'BTREE',
  GIN = 'GIN',
  GIST = 'GIST',
  HASH = 'HASH',
  SPGIST = 'SPGIST',
}

export class Table<Name extends string, T extends RecordType, PK extends Field<T> | undefined = undefined> {
  public readonly rep: Postgresql.Rep<T>;
  public readonly tableName: Name;
  public readonly type: T;
  public readonly primarykey: PK;

  constructor(props: {
    tableName: Name,
    type: T,
    primaryKey?: PK;
    indexes?: Array<{
      fields: Field<T> | Fields<T>,
      unique?: boolean;
      where?: (record: Postgresql.Fields<T>) => Bool;
      using?: IndexType;
    }>
  }) {
    this.rep = Postgresql.rep(props.type);
    this.tableName = props.tableName;
    this.type = props.type;
    this.primarykey = props.primaryKey!;
  }

  public get(id: {
    [K in Table.Names<PK>]: Value.Of<T['members'][K]>;
  }): SQL<Value.Of<T> | undefined> {
    throw new Error('todo');
  }

  public select<F extends Query.Fields>(f: (row: Postgresql.Fields<T>) => F): Query.Select<F> {
    return new Query.Select(f(this.rep.fields as any));
  }

  public where(f: (row: Postgresql.Fields<T>) => Bool): Query.Filtered<{ [N in Name]: Postgresql.Fields<T>; }> {
    return new Query.Filtered(this, f(this.groups));
  }

  public groupBy<G extends Query.Fields>(f: (row: Postgresql.Fields<T>) => G): Query.Grouped<G, { [N in Name]: Postgresql.Fields<T> }> {
    throw new Error('todo');
  }

  public insert(value: Value.Of<T>): Generator<unknown, void>;

  public insert<Returning extends Fields<T>>(value: Value.Of<T>, props: {
    returning: Returning
  }): Generator<unknown, {
    [F in Extract<Returning[keyof Returning], string>]: Value.Of<T['members'][F]>;
  }>;

  public insert(...args: any[]): any {
    return null as any;
  }
}
export namespace Table {
  export type GetName<T extends Table<any, any, any>> = T extends Table<infer N, any, any> ? N : never;
  export type GetType<T extends Table<any, any, any>> = T extends Table<any, infer TT, any> ? TT : never;
  export type GetPrimaryKeyNames<T extends Table<any, any, any>> =
    T extends Table<any, any, infer PK> ? Names<PK> :
    never
    ;
  export type Names<PK> =
    PK extends string ? PK :
    PK extends string[] ? PK[keyof PK] :
    PK extends undefined ? never :
    never
    ;
}
