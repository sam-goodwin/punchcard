import { RuntimeShape, Shape } from '../shape';

import { Mapper as IMapper, Reader, Writer } from '../mapper/mapper';
import { Raw } from '../mapper/raw';

export namespace Json {
  export interface Configuration {
    reader?: Reader<any>;
    writer?: Writer<any>;
    validate?: boolean;
  }

  export function jsonLine<T extends Shape<any>>(type: T, configuration?: Configuration): IMapper<RuntimeShape<T>, string> {
    const m = forShape(type, configuration);
    return {
      read: s => m.read(s),
      write: s => `${m.write(s)}\n`
    };
  }

  export function forShape<S extends Shape<any>>(shape: S, configuration?: Configuration): IMapper<RuntimeShape<S>, string> {
    return new Mapper(shape, configuration);
  }

  export function forAny(): IMapper<any, string> {
    return {
      read: JSON.parse,
      write: JSON.stringify
    };
  }

  export class Mapper<T extends Shape<any>> implements IMapper<RuntimeShape<T>, string> {
    private readonly reader: Reader<any>;
    private readonly writer: Writer<any>;
    private readonly validate: boolean;

    constructor(private readonly type: T, configuration: Configuration = {}) {
      this.reader = configuration.reader || Raw.Reader.instance;
      this.writer = configuration.writer || Raw.Writer.instance;
      this.validate = configuration.validate === undefined ? true : configuration.validate;
    }

    public read(json: string): RuntimeShape<T> {
      const record: RuntimeShape<T> = this.reader.read(this.type, JSON.parse(json));
      if (this.validate) {
        this.type.validate(record);
      }
      return record;
    }

    public write(record: RuntimeShape<T>): string {
      if (this.validate) {
        this.type.validate(record);
      }
      return JSON.stringify(this.writer.write(this.type, record));
    }
  }

  export function basic<T>(): IMapper<T, string> {
    return basicInstance as IMapper<T, string>;
  }

  class Basic<T> implements IMapper<T, string> {
    public read(json: string): T {
      return JSON.parse(json) as T;
    }

    public write(record: T): string {
      return JSON.stringify(record);
    }
  }

  const basicInstance = new Basic();
}
