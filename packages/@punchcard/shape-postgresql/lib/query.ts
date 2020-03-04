import { NumericShape, RecordType } from '@punchcard/shape';
import { RowLacks } from 'typelevel-ts';
import { Bool, Numeric, Postgresql, Rep } from './representation';
import { Table } from './table';

export class Query<R extends Query.RowGroups> {
  constructor(public readonly groups: R) {}

  public where(f: (groups: R) => Bool): Query.Filtered<R> {
    return new Query.Filtered(this, f(this.groups));
  }

  public select<F extends Query.Fields>(f: (groups: R) => F): Query.Select<F> {
    return new Query.Select(f(this.groups));
  }

  public groupBy<G extends Query.Fields>(f: (groups: R) => G): Query.Grouped<G, R> {
    throw new Error('todo');
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
      ...this.groups,
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

  export class Filtered<R extends Query.RowGroups> {
    constructor(
      public readonly query: Query<R>,
      public readonly condition: Bool) {}

    public select<F extends Query.Fields>(f: (groups: R) => F): Query.Select<F> {
      return new Query.Select(f(this.query.groups));
    }

    public groupBy<G extends Rep[]>(f: (groups: R) => G): Query.Grouped<G, R> {
      throw new Error('todo');
    }
  }

  export class Grouped<G extends Rep[], R extends RowGroups> {
    constructor(public readonly groupedBy: G, public readonly fields: RowLacks<R, keyof R>) {}

    public having(f: (rows: Rows<R>) => Bool): this {
      throw new Error('todo');
    }

    public select<F extends Query.Fields>(f: (group: G, rows: Rows<R>) => F): Query.Select<F> {
      return new Query.Select(f(this.groups));
    }
  }

  export class Select<F extends Fields> {
    constructor(public readonly fields: F) {}
  }
}
export class Rows<R> {
  constructor() {}

  public map<T extends Rep>(f: (r: R) => T): Rows<T> {

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
