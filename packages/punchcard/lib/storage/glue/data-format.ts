import glue = require('@aws-cdk/aws-glue');
import { Json as JsonMapper, Mapper, RuntimeShape, Shape } from '../../shape';

/**
 * Maps a `glue.DataFormat` to a `Mapper` which can read and write its data.
 */
export interface DataFormat {
  format: glue.DataFormat;
  makeMapper<S extends Shape>(shape: S): Mapper<RuntimeShape<S>, string>;
}
export namespace DataFormat {
// tslint:disable-next-line: variable-name
  export const Json = {
    format: glue.DataFormat.Json,
    makeMapper: JsonMapper.forShape
  };
}
