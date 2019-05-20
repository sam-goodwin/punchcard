import { Shape, smallint } from '../../shape';

export interface Period<P extends Shape> {
  id: string;
  schema: P;
  milliseconds: number;
}

export namespace Period {
  namespace schemas {
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

  export type PT1M = typeof PT1M.schema;
  export const PT1M: Period<typeof schemas.PT1M> = {
    id: 'minutely',
    schema: schemas.PT1M,
    milliseconds: 60 * 1000
  };

  export type PT1H = typeof PT1H.schema;
  export const PT1H: Period<typeof schemas.PT1H> = {
    id: 'hourly',
    schema: schemas.PT1H,
    milliseconds: 60 * 60 * 1000
  };
}
