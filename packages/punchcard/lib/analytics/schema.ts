import { Columns } from '../glue';
import { RuntimeShape, StructShape, TimestampShape } from '../shape';

type IsTimestamp<S extends Columns, T extends keyof S> = S[T] extends TimestampShape ? T : never;
export class Schema<C extends Columns, T extends keyof C> {
  public readonly schemaName: string;
  public readonly shape: C;
  public readonly timestampField: T;

  constructor(props: {
    schemaName: string;
    shape: C;
    timestampField: IsTimestamp<C, T>;
  }) {
    this.schemaName = props.schemaName;
    this.shape = props.shape;
    this.timestampField = props.timestampField;
  }

  public timestamp(record: RuntimeShape<StructShape<C>>): Date {
    return (record as any as {[ts in T]: Date})[this.timestampField];
  }
}

export type Schemas = {
  [schemaName: string]: Schema<any, any>;
};
