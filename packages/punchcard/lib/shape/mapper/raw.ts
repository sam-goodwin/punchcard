import { ArrayShape } from '../array';
import { ClassType, Value } from '../instance';
import { Kind } from '../kind';
import { MapShape } from '../map';
import { OptionalShape } from '../optional';
import { SetShape } from '../set';
import { RuntimeShape, Shape } from '../shape';
import { struct, StructShape } from '../struct';
import { TypeSet } from '../typed-set';
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

  export function forShape<S extends Shape>(shape: S, configuration?: Configuration): IMapper<RuntimeShape<S>, any> {
    return new Mapper(shape, configuration) as any;
  }

  export function forType<T>(type: ClassType<T>, configuration?: Configuration): IMapper<Value<T>, any> {
    return new Mapper(struct(type), configuration);
  }

  export class Mapper<S extends Shape<any>> implements IMapper<any, string> {
    private readonly reader: IReader<any>;
    private readonly writer: IWriter<any>;
    private readonly validate: boolean;

    constructor(private readonly type: S, configuration?: Configuration) {
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

    public read(raw: any): RuntimeShape<S> {
      const record: RuntimeShape<S> = this.reader.read(this.type, raw);
      if (this.validate) {
        this.type.validate(record);
      }
      return record;
    }

    public write(record: RuntimeShape<S>): any {
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
      throw new Error(`expected a value with type ${expected} for ${kind}, got ${typeof parsed}`);
    }

    private readonly inputTimestampFormat: TimestampFormat;
    constructor(configuration: ReaderConfig = {}) {
      this.inputTimestampFormat = configuration.timestampFormat || TimestampFormat.ISO8601;
    }

    public read<shape extends Shape<V>, V>(shape: shape, parsed: any): any {
      if (shape.kind === Kind.Dynamic) {
        return parsed;
      } else if (shape.kind === Kind.Boolean) {
        if (typeof parsed !== 'boolean') {
          Reader.throwError(shape.kind, parsed, 'boolean');
        }
        return parsed;
      } else if (shape.kind === Kind.Integer || shape.kind === Kind.Number) {
        if (typeof parsed !== 'number') {
          Reader.throwError(shape.kind, parsed, 'number');
        }
        return parsed;
      } else if (shape.kind === Kind.String) {
        if (typeof parsed !== 'string') {
          Reader.throwError(shape.kind, parsed, 'string');
        }
        return parsed;
      } else if (shape.kind === Kind.Binary) {
        if (typeof parsed !== 'string') {
          Reader.throwError(shape.kind, parsed, 'string');
        }
        return new Buffer(parsed, 'base64');
      } else if (shape.kind === Kind.Timestamp) {
        if (typeof parsed !== 'string') {
          Reader.throwError(shape.kind, parsed, 'string');
        }
        return this.inputTimestampFormat.read(parsed);
      } else if (shape.kind === Kind.Optional) {
        if (parsed === undefined || parsed === null) {
          return undefined;
        } else {
          const optional = shape as any as OptionalShape<any>;
          return this.read(optional.type, parsed);
        }
      } else if (shape.kind === Kind.Struct) {
        if (typeof parsed !== 'object') {
          Reader.throwError(shape.kind, parsed, 'object');
        }

        const struct = shape as any as StructShape<any>;
        const result: any = {};
        Object.keys(struct.type).forEach(name => {
          const field = struct.type[name];
          const value = parsed[name];
          result[name] = this.read(field, value);
        });
        return result;
      } else if (shape.kind === Kind.Array) {
        if (!Array.isArray(parsed)) {
          Reader.throwError(shape.kind, parsed, 'array');
        }

        const array = shape as any as ArrayShape<any>;
        const itemType: any = array.itemType;
        return parsed.map((p: any) => this.read(itemType, p)) as any;
      } else if (shape.kind === Kind.Set) {
        if (!Array.isArray(parsed)) {
          Reader.throwError(shape.kind, parsed, 'array');
        }

        const set = shape as any as SetShape<any>;
        const itemType: any = set.itemType;
        const typedSet = TypeSet.forType(itemType);
        parsed.forEach((p: any) => typedSet.add(this.read(itemType, p)));
        return typedSet;
      } else if (shape.kind === Kind.Map) {
        if (typeof parsed !== 'object') {
          Reader.throwError(shape.kind, parsed, 'object');
        }
        const map = shape as any as MapShape<any>;
        const result: any = {};
        Object.keys(parsed).forEach(name => {
          const value = parsed[name];
          result[name] = this.read(map.valueType, value);
        });
        return result;
      } else {
        throw new Error(`encountered unknown type, ${shape.kind}`);
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

    public write<S extends Shape<V>, V>(shape: S, value: any): any {
      if (shape.kind === Kind.Dynamic) {
        return value;
      } else if (shape.kind === Kind.Boolean) {
        return value;
      } else if (shape.kind === Kind.Integer || shape.kind === Kind.Number) {
        return value;
      } else if (shape.kind === Kind.String) {
        return value;
      } else if (shape.kind === Kind.Binary) {
        return value.toString('base64');
      } else if (shape.kind === Kind.Timestamp) {
        return this.outputTimestampFormat.write(value);
      } else if (shape.kind === Kind.Optional) {
        if (value === undefined || value === null) {
          return this.writeNulls ? null : undefined;
        } else {
          const optional = shape as any as OptionalShape<any>;
          return this.write(optional.type, value);
        }
      } else if (shape.kind === Kind.Struct) {
        const s = shape as any as StructShape<any>;
        const result: any = {};
        Object.keys(s.type).forEach(name => {
          const field = s.type[name];
          const v = value[name];
          result[name] = this.write(field, v);
        });
        return result;

      } else if (shape.kind === Kind.Array) {
        const array = shape as any as ArrayShape<any>;
        const itemType: any = array.itemType;
        return value.map((p: any) => this.write(itemType, p));
      } else if (shape.kind === Kind.Set) {
        const setType = shape as any as SetShape<any>;
        const setValue: TypeSet<any> = value;
        const itemType: any = setType.itemType;
        const result = [];
        for (const v of setValue.values()) {
          result.push(this.write(itemType, v));
        }
        return result;
      } else if (shape.kind === Kind.Map) {
        const map = shape as any as MapShape<any>;
        const result: any = {};
        Object.keys(value).forEach(name => {
          const v = value[name];
          result[name] = this.write(map.valueType, v);
        });
        return result;
      } else {
        throw new Error(`encountered unknown type, ${shape.kind}`);
      }
    }
  }
}
