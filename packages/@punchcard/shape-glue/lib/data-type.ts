import { Mapper, Shape, Value } from '@punchcard/shape';
import { JsonDataType } from './json';

import { DataFormat } from '@aws-cdk/aws-glue';

/**
 * Represents an Abstract Glue Data Type.
 */
export interface DataType {
  readonly format: DataFormat;
  readonly extension: string;
  mapper<T extends Shape>(type: T): Mapper<Value.Of<T>, Buffer>;
  split(buffer: Buffer): Iterable<Buffer>;
  join(buffers: Buffer[]): Buffer;
}
export namespace DataType {
  export const Json = new JsonDataType();
}
