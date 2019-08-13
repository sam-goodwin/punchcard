import { Shape, smallint } from '../shape';

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
  export type PT1H = typeof PT1H;
  export type PT1M = typeof PT1M;
}

export class Period<P extends Shape> {
  public static readonly PT1M: Period<Period.PT1M> = new Period('minutely', PT1M, 60 * 1000);
  public static readonly PT1H: Period<Period.PT1H> = new Period('hourly', PT1M, 60 * 60 * 1000);

  constructor(
    public readonly id: string,
    public readonly schema: P,
    public readonly milliseconds: number
  ) {}
}
