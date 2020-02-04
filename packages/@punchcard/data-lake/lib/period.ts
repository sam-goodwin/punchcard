import { Record } from '@punchcard/shape';
import { smallint } from '@punchcard/shape-hive';

export class PT1H extends Record({
  year: smallint,
  month: smallint,
  day: smallint,
  hour: smallint
}) {}

export class PT1M extends Record({
  year: smallint,
  month: smallint,
  day: smallint,
  hour: smallint,
  minute: smallint
}) {}

export namespace Period {
  /**
   * Shape of a minutely `Glue.Partition`.
   */
  export type PT1H = typeof PT1H;

  /**
   * Shape of an hourly `Glue.Partition`.
   */
  export type PT1M = typeof PT1M;
}

/**
 * Represents a `Glue.Partition` partitioned by time.
 */
export class Period<P> {
  /**
   * Minutely partitions.
   */
  public static readonly PT1M: Period<Period.PT1M> = new Period('minutely', PT1M, 60 * 1000);

  /**
   * Hourly partitions.
   */
  public static readonly PT1H: Period<Period.PT1H> = new Period('hourly', PT1H, 60 * 60 * 1000);

  constructor(
    public readonly id: string,
    public readonly schema: P,
    public readonly milliseconds: number
  ) {}
}
