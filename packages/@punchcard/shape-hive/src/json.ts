import { Mapper, Shape, TimestampShape, Value } from '@punchcard/shape';

import { DataFormat } from './data-format';
import { DataType } from './data-type';

import { Json } from '@punchcard/shape-json';

/**
 * JSON Mapper specifically for AWS Glue (Hive JSON Format) which
 * requires timestamps be stored as `YYYY-MM-DD HH:mm:ss.SSS`.
 */
export class JsonMapperVisitor extends Json.MapperVisitor {
  public static readonly instance = new JsonMapperVisitor();

  private static readonly TIME_FORMAT = /^\d{4}-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})$/;

  public timestampShape(shape: TimestampShape): Mapper<Date, string> {
    return {
      // TODO: why the f doesn't athena support ISO8601 string lol
      write: formatHiveDateString,
      read: (value: string) => {
        const match = value.match(JsonMapperVisitor.TIME_FORMAT);
        if (!match) {
          const ms = Date.parse(value);
          if (!isNaN(ms)) {
            return new Date(ms);
          }
          throw new Error(`invalid Hive timestamp format, expected ISO8601 or YYYY-MM-DD HH:mm:ss.SSS, got: ${value}`);
        }
        const year = parseInt(match[0], 10);
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        const hour = parseInt(match[3], 10);
        const minute = parseInt(match[4], 10);
        const second = parseInt(match[5], 10);
        const ms = parseInt(match[6], 10);
        return new Date(Date.UTC(year, month, day, hour, minute, second, ms));
      }
    };
  }
}

function formatHiveDateString(d: Date) {
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)} ${pad(d.getUTCHours(), 2)}:${pad(d.getUTCMinutes(), 2)}:${pad(d.getUTCSeconds(), 2)}.${pad(d.getUTCMilliseconds(), 3)}`;
}

function pad(str: string | number, length: number) {
  if (typeof str === 'number') {
    str = str.toString(10);
  }
  while (str.length < length) {
    str = '0' + str;
  }
  return str;
}

export class JsonDataType implements DataType {
  public static readonly instance = new JsonDataType();

  public readonly format = DataFormat.JSON;

  public readonly extension: 'json' = 'json';

  public mapper<T extends Shape>(type: T): Mapper<Value.Of<T>, Buffer> {
    const jsonMapper = Json.mapper(type, {
      visitor: JsonMapperVisitor.instance
    });

    return {
      read: buffer => jsonMapper.read(JSON.parse(buffer.toString('utf8'))) as any,
      write: value => Buffer.from(JSON.stringify(jsonMapper.write(value as any)) + '\n', 'utf8')
    };
  }

  public *split(buffer: Buffer): Iterable<Buffer> {
    const lines = buffer.toString('utf8').split('\n');
    for (const line of lines) {
      if (line.length > 0) {
        yield Buffer.from(line, 'utf8');
      }
    }
  }

  public join(buffers: Buffer[]): Buffer {
    return Buffer.concat(buffers);
  }
}

const newLine = Buffer.from('\n', 'utf8');
