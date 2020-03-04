import { NumericShape, RecordType } from '@punchcard/shape';
import { Bool, Numeric, Postgresql, Rep } from './representation';
import { Table } from './table';

export interface Row<R> {
  readonly row: R;
}

export interface CanSelect<R> extends Row<R> {
  select<F extends Query.Fields>(f: (row: R) => F): Query.Select<F>
}

export interface CanWhere<R> {
  where(f: (row: R) => Bool): Query.Filtered<R>
}

export interface CanGroup<R> {
  groupBy<G extends Rep[]>(f: (groups: R) => G): Query.Grouped<G, R>;
}

export interface CanJoin<Name extends string, R> extends Row<R> {
  join<T2 extends Table<any, any, any>, As extends string>(other: As extends keyof R ? never : T2, props: {
    as: As,
    on?: (groups: {
      [g in keyof R]: R[g];
    } & {
      [N in As]: Postgresql.Fields<Table.GetType<T2>>;
    }) => Bool
  }): Query<R & {
    [N in As]: Postgresql.Fields<Table.GetType<T2>>;
  }>;

  join<T2 extends Table<any, any, any>>(other: Table.GetName<T2> extends keyof R ? never : T2, props?: {
    on?: (groups: {
      [g in keyof R]: R[g];
    } & {
      [N in Table.GetName<T2>]: Postgresql.Fields<Table.GetType<T2>>;
    }) => Bool;
  }): Query<R & {
    [N in Table.GetName<T2>]: Postgresql.Fields<Table.GetType<T2>>;
  }>;
}

export class Query<R extends Query.RowGroups> implements Row<R> {
  constructor(public readonly row: R) {}

  public groupBy<G extends Rep[]>(f: (groups: R) => G): Query.Grouped<G, R> {
    throw new Error('todo');
  }

  public where(f: (groups: R) => Bool): Query.Filtered<R> {
    return new Query.Filtered(this.row, f(this.row));
  }

  public select<F extends Query.Fields>(f: (groups: R) => F): Query.Select<F> {
    return new Query.Select(f(this.row));
  }

  public join<T2 extends Table<any, any, any>, As extends string>(other: As extends keyof R ? never : T2, props: {
    as: As,
    on?: (groups: {
      [g in keyof R]: R[g];
    } & {
      [N in As]: Postgresql.Fields<Table.GetType<T2>>;
    }) => Bool
  }): Query<R & {
    [N in As]: Postgresql.Fields<Table.GetType<T2>>;
  }>;

  public join<T2 extends Table<any, any, any>>(other: Table.GetName<T2> extends keyof R ? never : T2, props?: {
    on?: (groups: {
      [g in keyof R]: R[g];
    } & {
      [N in Table.GetName<T2>]: Postgresql.Fields<Table.GetType<T2>>;
    }) => Bool;
  }): Query<R & {
    [N in Table.GetName<T2>]: Postgresql.Fields<Table.GetType<T2>>;
  }>;

  public join(other: Table<any, any, any>, props?: any): any {
    const alias = props?.as || other.tableName;
    return new Query({
      ...this.row,
      [alias]: 'todo' as any
    });
  }
}
export namespace Query {
  export type From<T extends RecordType, As extends string> = Query<{
    [as in As]: Postgresql.Fields<T>;
  }>;

  export function from<T extends Table<any, any, any>>(table: T): From<Table.GetType<T>, Table.GetName<T>>;

  export function from<T extends Table<any, any, any>, As extends string>(table: T, props: { as: As }): From<Table.GetType<T>, As>;

  export function from(props?: any): any {
    throw new Error('todo');
  }

  export interface Tuple extends Array<Rep> {}

  export interface Fields {
    [fieldName: string]: Rep;
  }
  export interface RowGroups {
    [alias: string]: Fields;
  }

  export class Filtered<R> implements Row<R> {
    constructor(
      public readonly row: R,
      public readonly condition: Bool) {}

    public select<F extends Query.Fields>(f: (row: R) => F): Query.Select<F> {
      return new Query.Select(f(this.row));
    }

    public groupBy<G extends Rep[]>(f: (groups: R) => G): Query.Grouped<G, R> {
      throw new Error('todo');
    }
  }

  export class Grouped<G extends Rep[], R> implements Row<[G, R]> {
    public readonly row: [G, R];
    constructor(groupedBy: G, row: R) {
      this.row = [groupedBy, row];
    }

    public having(f: (rows: Rows<R>) => Bool): this {
      throw new Error('todo');
    }

    public select<F extends Query.Fields>(f: (group: G, rows: Rows<R>) => F): Query.Select<F> {
      return new Query.Select(f(this.row[0], new Rows(this.row[1])));
    }
  }

  export function select<R extends Query.Fields | Query.RowGroups>(selection: '*', from: Row<R>): Query.Select<R>;
  export function select<G extends Rep[], R, F extends Query.Fields | Query.RowGroups>(selection: (group: G, row: R) => F, from: Query.Grouped<G, R>): Query.Select<F>;
  export function select<R, F extends Query.Fields | Query.RowGroups>(selection: (row: R) => F, from: Row<R>): Query.Select<F>;
  export function select(sel: any, from: any): any {
    return from.select(f);
  }

  export class Select<F extends Fields | RowGroups> {
    constructor(public readonly fields: F) {}
  }
}

export const from = Query.from;
export const select = Query.select;

export type Rowz<R>= {};

export class Rows<R> {
  constructor(public readonly row: R) {}

  public map<T extends Rep>(f: (r: R) => T): Rows<T> {
    throw new Error('todo');
  }
}

const agg = Symbol.for('agg');
export class Agg<T> {
  public readonly [agg]: true = true;
}

export namespace Agg {
  export function avg(rows: Rows<Rep<NumericShape>>): Numeric {
    return new Agg();
  }
}

export const avg = Agg.avg;
