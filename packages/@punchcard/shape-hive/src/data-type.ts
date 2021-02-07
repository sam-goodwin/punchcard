import { Mapper, Shape, Value } from '@punchcard/shape';
import { DataFormat } from './data-format';
import { JsonDataType } from './json';

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
