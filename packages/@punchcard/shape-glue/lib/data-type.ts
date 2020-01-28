import { Shape } from '@punchcard/shape';
import { Mapper, Value } from '@punchcard/shape-runtime';

import { DataFormat } from '@aws-cdk/aws-glue';
import { JsonDataType } from './json';

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
