import { TimestampShape, TypeShape, Value } from '@punchcard/shape';

type IsTimestamp<T extends TypeShape, TS extends keyof T['Members']> = T['Members'][TS] extends TimestampShape ? TS : never;
export class Schema<
  T extends TypeShape,
  TS extends keyof T['Members'],
  ID extends keyof T['Members']
> {
  public readonly schemaName: string;
  public readonly shape: T;
  public readonly timestampField: TS;
  public readonly id: ID;

  constructor(props: {
    schemaName: string;
    shape: T;
    timestampField: IsTimestamp<T, TS>;
    id: ID
  }) {
    this.schemaName = props.schemaName;
    this.shape = props.shape;
    this.timestampField = props.timestampField;
    this.id = props.id;
  }

  public timestamp(record: Value.Of<T>): Date {
    return (record as any as {[ts in TS]: Date})[this.timestampField];
  }
}
