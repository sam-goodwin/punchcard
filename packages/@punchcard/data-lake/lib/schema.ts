import { ClassShape, ClassType, TimestampShape, Value } from '@punchcard/shape';

type IsTimestamp<T extends ClassType, TS extends keyof T[ClassShape.Members]> = T[ClassShape.Members][TS] extends TimestampShape ? TS : never;
export class Schema<T extends ClassType, TS extends keyof T[ClassShape.Members]> {
  public readonly schemaName: string;
  public readonly shape: T;
  public readonly timestampField: TS;

  constructor(props: {
    schemaName: string;
    shape: T;
    timestampField: IsTimestamp<T, TS>;
  }) {
    this.schemaName = props.schemaName;
    this.shape = props.shape;
    this.timestampField = props.timestampField;
  }

  public timestamp(record: Value.Of<T>): Date {
    return (record as any as {[ts in TS]: Date})[this.timestampField];
  }
}

export type Schemas = {
  [schemaName: string]: Schema<any, any>;
};
