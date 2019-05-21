import glue = require('@aws-cdk/aws-glue');
import { Json as JsonMapper, Mapper, RuntimeShape, Shape } from '../../shape';

/**
 * Maps a `glue.DataFormat` to a `Mapper` which can read and write its data.
 */
export interface Codec {
  extension: string;
  format: glue.DataFormat;
  mapper<S extends Shape>(shape: S): Mapper<RuntimeShape<S>, Buffer>;
  split(buffer: Buffer): Iterable<Buffer>;
  join(buffers: Buffer[]): Buffer;
}
export namespace Codec {
// tslint:disable-next-line: variable-name
  export const Json: Codec = {
    extension: 'json',
    format: glue.DataFormat.Json,
    mapper: shape => {
      const json = JsonMapper.jsonLine(shape);
      return {
        read: (buffer) => json.read(buffer.toString('utf8')),
        write: (record) => new Buffer(json.write(record), 'utf8')
      };
    },
    split: buffer => {
      return (function*() {
        const lines = buffer.toString('utf8').split('\n');
        for (const line of lines) {
          yield new Buffer(line, 'utf8');
        }
      })();
    },
    join: buffers => new Buffer(buffers.map(buf => buf.toString('utf8')).join('\n'))
  };
}
