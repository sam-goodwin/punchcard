import { RuntimeShape, StructShape, TimestampShape } from '../shape';

type IsTimestamp<S extends StructShape<any>, T extends keyof S> = S[T] extends TimestampShape ? T : never;
export class Schema<S extends StructShape<any>, T extends keyof S> {
  public readonly schemaName: string;
  public readonly shape: S;
  public readonly timestampField: T;

  constructor(props: {
    schemaName: string;
    shape: S;
    timestampField: IsTimestamp<S, T>;
  }) {
    this.schemaName = props.schemaName;
    this.shape = props.shape;
    this.timestampField = props.timestampField;
  }

  public timestamp(record: RuntimeShape<S>): Date {
    return (record as any as {[ts in T]: Date})[this.timestampField];
  }
}

export type Schemas = {
  [schemaName: string]: Schema<any, any>;
};
