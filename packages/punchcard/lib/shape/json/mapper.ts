import { RuntimeShape, Shape } from '../shape';

import { Mapper as IMapper, Reader, Writer } from '../mapper/mapper';
import { Raw } from '../mapper/raw';
import { struct, Type } from '../types';

export namespace Json {
  export interface Configuration {
    reader?: Reader<any>;
    writer?: Writer<any>;
    validate?: boolean;
  }

  export function jsonLine<S extends Shape>(shape: S, configuration?: Configuration): IMapper<RuntimeShape<S>, string> {
    const m = forShape(shape, configuration);
    return {
      read: s => m.read(s),
      write: s => `${m.write(s)}\n`
    };
  }

  export function forShape<S extends Shape>(shape: S, configuration?: Configuration): IMapper<RuntimeShape<S>, string> {
    return Json.forType(struct(shape), configuration);
  }

  export function forAny(): IMapper<any, string> {
    return {
      read: JSON.parse,
      write: JSON.stringify
    };
  }

  type InferType<T extends Type<any>> = T extends Type<infer V> ? V : never;
  export function forType<T extends Type<any>>(type: T, configuration?: Configuration): IMapper<InferType<T>, string> {
    return new Mapper(type, configuration);
  }

  export class Mapper<T extends Type<V>, V> implements IMapper<V, string> {
    private readonly reader: Reader<any>;
    private readonly writer: Writer<any>;
    private readonly validate: boolean;

    constructor(private readonly type: T, configuration: Configuration = {}) {
      this.reader = configuration.reader || Raw.Reader.instance;
      this.writer = configuration.writer || Raw.Writer.instance;
      this.validate = configuration.validate === undefined ? true : configuration.validate;
    }

    public read(json: string): V {
      const record: V = this.reader.read(this.type, JSON.parse(json));
      if (this.validate) {
        this.type.validate(record);
      }
      return record;
    }

    public write(record: V): string {
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
