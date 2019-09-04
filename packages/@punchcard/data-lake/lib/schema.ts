import { Glue } from 'punchcard';
import { RuntimeShape, StructShape, TimestampShape } from 'punchcard/lib/shape';

type IsTimestamp<S extends Glue.Columns, T extends keyof S> = S[T] extends TimestampShape ? T : never;
export class Schema<C extends Glue.Columns, T extends keyof C> {
  public readonly schemaName: string;
  public readonly shape: C;
  public readonly timestampField: T;
  public readonly dataAsOf: Date;

  constructor(props: {
    schemaName: string;
    shape: C;
    timestampField: IsTimestamp<C, T>;
    dataAsOf: Date;
  }) {
    this.schemaName = props.schemaName;
    this.shape = props.shape;
    this.timestampField = props.timestampField;
    this.dataAsOf = props.dataAsOf;
  }

  public timestamp(record: RuntimeShape<StructShape<C>>): Date {
    return (record as any as {[ts in T]: Date})[this.timestampField];
  }
}

export type Schemas = {
  [schemaName: string]: Schema<any, any>;
};
