import { RuntimeShape, Shape } from '../shape';
import { ArrayType, Kind, MapType, OptionalType, SetType, struct, StructType, Type, TypeSet } from '../types';
import { Mapper as IMapper, Reader as IReader, Writer as IWriter } from './mapper';
import { TimestampFormat } from './timestamp';

// tslint:disable: no-console

export namespace Raw {
  export interface Configuration {
    readonly reader?: IReader<any>;
    readonly writer?: IWriter<any>;
    readonly validate?: boolean;
  }

  const pass = {
    read: (a: any) => a,
    write: (a: any) => a
  };
  export function passthrough<T>(): IMapper<T, any> {
    return pass;
  }

  export function forShape<S extends Shape>(shape: S, configuration?: Configuration): IMapper<RuntimeShape<S>, string> {
    return Raw.forType(struct(shape), configuration);
  }

  export function forType<T extends Type<V>, V>(type: T, configuration?: Configuration): IMapper<V, string> {
    return new Mapper(type, configuration);
  }

  export class Mapper<T extends Type<V>, V> implements IMapper<V, string> {
    private readonly reader: IReader<any>;
    private readonly writer: IWriter<any>;
    private readonly validate: boolean;

    constructor(private readonly type: T, configuration?: Configuration) {
      if (configuration) {
        this.reader = configuration.reader || Raw.Reader.instance;
        this.writer = configuration.writer || Raw.Writer.instance;
        this.validate = configuration.validate === undefined ? true : false;
      } else {
        this.reader = Raw.Reader.instance;
        this.writer = Raw.Writer.instance;
        this.validate = true;
      }
    }

    public read(raw: any): V {
      const record: V = this.reader.read(this.type, raw);
      if (this.validate) {
        this.type.validate(record);
      }
      return record;
    }

    public write(record: V): any {
      if (this.validate) {
        this.type.validate(record);
      }
      return this.writer.write(this.type, record);
    }
  }

  export interface ReaderConfig {
    timestampFormat?: TimestampFormat;
  }

  export class Reader implements IReader<any> {
    public static readonly instance: Reader = new Reader();

    private static throwError(kind: Kind, parsed: any, expected: string) {
// tslint:disable-next-line: no-console
      console.log('typeof parsed', typeof parsed);
      throw new Error(`expected a value with type ${expected} for ${kind}, got ${typeof parsed}`);
    }

    private readonly inputTimestampFormat: TimestampFormat;
    constructor(configuration: ReaderConfig = {}) {
      this.inputTimestampFormat = configuration.timestampFormat || TimestampFormat.ISO8601;
    }

    public read<T extends Type<V>, V>(type: T, parsed: any): any {
      if (type.kind === Kind.Boolean) {
        if (typeof parsed !== 'boolean') {
          Reader.throwError(type.kind, parsed, 'boolean');
        }
        return parsed;
      } else if (type.kind === Kind.Integer || type.kind === Kind.Number) {
        if (typeof parsed !== 'number') {
          Reader.throwError(type.kind, parsed, 'number');
        }
        return parsed;
      } else if (type.kind === Kind.String) {
        if (typeof parsed !== 'string') {
          Reader.throwError(type.kind, parsed, 'string');
        }
        return parsed;
      } else if (type.kind === Kind.Binary) {
        if (typeof parsed !== 'string') {
          Reader.throwError(type.kind, parsed, 'string');
        }
        return new Buffer(parsed, 'base64');
      } else if (type.kind === Kind.Timestamp) {
        if (typeof parsed !== 'string') {
          Reader.throwError(type.kind, parsed, 'string');
        }
        return this.inputTimestampFormat.read(parsed);
      } else if (type.kind === Kind.Optional) {
        if (parsed === undefined || parsed === null) {
          return undefined;
        } else {
          const optional = type as any as OptionalType<any, any>;
          return this.read(optional.type, parsed);
        }
      } else if (type.kind === Kind.Struct) {
        if (typeof parsed !== 'object') {
          Reader.throwError(type.kind, parsed, 'object');
        }

// tslint:disable-next-line: no-shadowed-variable
        const struct = type as any as StructType<any>;
        const result: any = {};
        Object.keys(struct.shape).forEach(name => {
          const field = struct.shape[name];
          const value = parsed[name];
          result[name] = this.read(field, value);
        });
        return result;
      } else if (type.kind === Kind.Array) {
        if (!Array.isArray(parsed)) {
          Reader.throwError(type.kind, parsed, 'array');
        }

        const array = type as any as ArrayType<any, any>;
        const itemType: any = array.itemType;
        return parsed.map((p: any) => this.read(itemType, p)) as any;
      } else if (type.kind === Kind.Set) {
        if (!Array.isArray(parsed)) {
          Reader.throwError(type.kind, parsed, 'array');
        }

        const set = type as any as SetType<any, any>;
        const itemType: any = set.itemType;
        const typedSet = TypeSet.forType(itemType);
        parsed.forEach((p: any) => typedSet.add(this.read(itemType, p)));
        return typedSet;
      } else if (type.kind === Kind.Map) {
        if (typeof parsed !== 'object') {
          Reader.throwError(type.kind, parsed, 'object');
        }
        const map = type as any as MapType<any, any>;
        const result: any = {};
        Object.keys(parsed).forEach(name => {
          const value = parsed[name];
          result[name] = this.read(map.valueType, value);
        });
        return result;
      } else {
        throw new Error(`encountered unknown type, ${type.kind}`);
      }
    }
  }

  export interface WriterConfig {
    timestampFormat?: TimestampFormat;
    writeNulls?: boolean;
  }

  export class Writer implements IWriter<any> {
    public static readonly instance = new Writer();

    private readonly outputTimestampFormat: TimestampFormat;
    private readonly writeNulls: boolean;

    constructor(configuration: WriterConfig = {}) {
      this.outputTimestampFormat = configuration.timestampFormat || TimestampFormat.ISO8601;
      this.writeNulls = configuration.writeNulls !== undefined ? configuration.writeNulls : true;
    }

    public write<T extends Type<V>, V>(type: T, value: any): any {
      if (type.kind === Kind.Boolean) {
        return value;
      } else if (type.kind === Kind.Integer || type.kind === Kind.Number) {
        return value;
      } else if (type.kind === Kind.String) {
        return value;
      } else if (type.kind === Kind.Binary) {
        return value.toString('base64');
      } else if (type.kind === Kind.Timestamp) {
        return this.outputTimestampFormat.write(value);
      } else if (type.kind === Kind.Optional) {
        if (value === undefined || value === null) {
          return this.writeNulls ? null : undefined;
        } else {
          const optional = type as any as OptionalType<any, any>;
          return this.write(optional.type, value);
        }
      } else if (type.kind === Kind.Struct) {
        const s = type as any as StructType<any>;
        const result: any = {};
        Object.keys(s.shape).forEach(name => {
          const field = s.shape[name];
          const v = value[name];
          result[name] = this.write(field, v);
        });
        return result;

      } else if (type.kind === Kind.Array) {
        const array = type as any as ArrayType<any, any>;
        const itemType: any = array.itemType;
        return value.map((p: any) => this.write(itemType, p));
      } else if (type.kind === Kind.Set) {
        const setType = type as any as SetType<any, any>;
        const setValue: TypeSet<any, any> = value;
        const itemType: any = setType.itemType;
        const result = [];
        for (const v of setValue.values()) {
          result.push(this.write(itemType, v));
        }
        return result;
      } else if (type.kind === Kind.Map) {
        const map = type as any as MapType<any, any>;
        const result: any = {};
        Object.keys(value).forEach(name => {
          const v = value[name];
          result[name] = this.write(map.valueType, v);
        });
        return result;
      } else {
        throw new Error(`encountered unknown type, ${type.kind}`);
      }
    }
  }
}
