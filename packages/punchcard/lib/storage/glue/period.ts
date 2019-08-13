import { Shape, smallint } from '../../shape';
import { Glue } from './table';

declare module './table' {
  export namespace Glue {
    export interface Period<P extends Shape> {
      id: string;
      schema: P;
      milliseconds: number;
    }
    export namespace Period {
      export type PT1H = typeof Periods.PT1H;
      export type PT1M = typeof Periods.PT1M;

      export const PT1M: Period<PT1M>;
      export const PT1H: Period<PT1H>;
    }
  }
}

class Period<P extends Shape> implements Glue.Period<P> {
  constructor(
    public readonly id: string,
    public readonly schema: P,
    public readonly milliseconds: number
  ) {}
}

(Glue.Period as any).PT1M = new Period('minutely', Periods.PT1M, 60 * 1000);
(Glue.Period as any).PT1H = new Period('hourly', Periods.PT1M, 60 * 60 * 1000);

namespace Periods {
  export const PT1H = {
    year: smallint(),
    month: smallint(),
    day: smallint(),
    hour: smallint()
  };

  export const PT1M = {
    year: smallint(),
    month: smallint(),
    day: smallint(),
    hour: smallint(),
    minute: smallint()
  };
}
