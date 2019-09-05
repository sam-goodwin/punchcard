import { PartitionKeys } from 'punchcard/lib/glue';
import { RuntimeShape, smallint, StructShape } from 'punchcard/lib/shape';

const PT1H = {
  year: smallint(),
  month: smallint(),
  day: smallint(),
  hour: smallint()
};

const PT1M = {
  year: smallint(),
  month: smallint(),
  day: smallint(),
  hour: smallint(),
  minute: smallint()
};

export namespace Period {
  /**
   * Shape of a minutely `Glue.Partition`.
   */
  export type PT1H = typeof PT1H;
  export type PT1HValue = RuntimeShape<StructShape<PT1H>>;

  /**
   * Shape of an hourly `Glue.Partition`.
   */
  export type PT1M = typeof PT1M;
  export type PT1MValue = RuntimeShape<StructShape<PT1M>>;
}

/**
 * Represents a `Glue.Partition` partitioned by time.
 */
export class Period<P extends PartitionKeys> {
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
