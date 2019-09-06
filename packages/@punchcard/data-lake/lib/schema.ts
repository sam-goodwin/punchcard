import { Glue } from 'punchcard';
import { RuntimeShape, StructShape, TimestampShape } from 'punchcard/lib/shape';

type IsTimestamp<C extends Glue.Columns, TS extends keyof C> = C[TS] extends TimestampShape ? TS : never;
export class Schema<C extends Glue.Columns, TS extends keyof C> {
  public readonly schemaName: string;
  public readonly shape: C;
  public readonly timestampField: TS;
  public readonly dataAsOf: Date;
  public readonly shouldDelete?: (record: RuntimeShape<StructShape<C>>, customerIds: Set<string>) => boolean;

  constructor(props: {
    schemaName: string;
    shape: C;
    timestampField: IsTimestamp<C, TS>;
    dataAsOf: Date;
    shouldDelete?: (record: RuntimeShape<StructShape<C>>, customerIds: Set<string>) => boolean;
  }) {
    this.schemaName = props.schemaName;
    this.shape = props.shape;
    this.timestampField = props.timestampField;
    this.dataAsOf = props.dataAsOf;
    this.shouldDelete = props.shouldDelete;
  }

  public timestamp(record: RuntimeShape<StructShape<C>>): Date {
    return (record as any as {[ts in TS]: Date})[this.timestampField];
  }
}

export type Schemas = {
  [schemaName: string]: Schema<any, any>;
};
