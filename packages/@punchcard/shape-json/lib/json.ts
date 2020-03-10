import { isOptional, RecordType, RequiredKeys } from '@punchcard/shape';
import { HashSet, Mapper, ValidatingMapper, Value, Visitor as ShapeVisitor } from '@punchcard/shape';
import { ArrayShape, MapShape, SetShape } from '@punchcard/shape/lib/collection';
import { BinaryShape, BoolShape, DynamicShape, IntegerShape, NothingShape, NumberShape, StringShape, TimestampShape } from '@punchcard/shape/lib/primitive';
import { RecordShape, ShapeOrRecord } from '@punchcard/shape/lib/record';
import { Shape } from '@punchcard/shape/lib/shape';

export type Tag = typeof Tag;
export const Tag = Symbol.for('@punchcard/shape-json.Json.Tag');

export namespace Json {
  export type Of<T extends RecordType | Shape> =  Shape.Of<T> extends { [Tag]: infer J } ? J : never;
}

declare module '@punchcard/shape/lib/shape' {
  export interface Shape {
    [Tag]: unknown;
  }
}
declare module '@punchcard/shape/lib/primitive' {
  export interface DynamicShape<T extends unknown | any> {
    [Tag]: T;
  }
  export interface BinaryShape {
    [Tag]: string;
  }
  export interface BoolShape {
    [Tag]: boolean;
  }
  export interface NumberShape {
    [Tag]: number;
  }
  export interface NothingShape {
    [Tag]: null;
  }
  export interface StringShape {
    [Tag]: string;
  }
  export interface TimestampShape {
    [Tag]: string;
  }
}

declare module '@punchcard/shape/lib/collection' {
  export interface ArrayShape<T extends Shape> {
    [Tag]: Json.Of<T>[];
  }
  export interface SetShape<T extends Shape> {
    [Tag]: Json.Of<T>[]
  }
  export interface MapShape<T extends Shape> {
    [Tag]: {
      [key: string]: Json.Of<T>;
    };
  }
}

declare module '@punchcard/shape/lib/record' {
  export interface RecordShape<M extends RecordMembers, I extends any> {
    [Tag]: {
      /**
       * Write each member and their documentation to the structure.
       * Write them all as '?' for now.
       */
      [m in keyof M]+?: Json.Of<M[m]>;
    } & {
      /**
       * Remove '?' from required properties.
       */
      [m in RequiredKeys<M>]-?: Json.Of<M[m]>;
    };
  }
}

export namespace Json {
  export interface MapperOptions {
    visitor?: MapperVisitor;
    validate?: boolean;
  }

  export function mapper<T extends ShapeOrRecord>(type: T, options: MapperOptions = {}): Mapper<Value.Of<T>, Json.Of<T>> {
    const shape = Shape.of(type) as any;
    let mapper = (shape as any).visit(options.visitor || new MapperVisitor());
    if (options.validate === true) {
      mapper = ValidatingMapper.of(type, mapper);
    }

    if (isOptional(shape)) {
      return {
        read: (v: any) => {
          if (v === undefined || v === null) {
            return v;
          }
          return mapper.read(v);
        },
        write: (v: any) => {
          if (v === undefined || v === null) {
            return v;
          }
          return mapper.write(v);
        }
      };
    }

    return mapper;
  }

  export function asString<T, U>(mapper: Mapper<T, U>): Mapper<T, string> {
    return {
      read: s => mapper.read(JSON.parse(s)),
      write: v => JSON.stringify(mapper.write(v))
    };
  }

  export function stringifyMapper<T extends ShapeOrRecord>(type: T, options: MapperOptions = {}): Mapper<Value.Of<T>, string> {
    const m = mapper(type, options);
    return {
      read: (s: string) => m.read(JSON.parse(s)) as any,
      write: v => JSON.stringify(m.write(v))
    };
  }

  export function bufferMapper<T extends ShapeOrRecord>(type: T, options: MapperOptions = {}): Mapper<Value.Of<T>, Buffer> {
    const m = mapper(type, options);
    return {
      read: (s: Buffer) => m.read(JSON.parse(s.toString('utf8'))) as any,
      write: v => Buffer.from(JSON.stringify(m.write(v)), 'utf8')
    };
  }

  export class MapperVisitor implements ShapeVisitor<Mapper<any, any>> {
    public nothingShape(shape: NothingShape, context: undefined): Mapper<void, any> {
      return {
        read: (a: any) => {
          if (typeof a === 'undefined' || a === null) {
            return null;
          }
          throw new Error(`expected null or undefined, got ${typeof a}, ${a}`);
        },
        write: () => null
      };
    }
    public dynamicShape(shape: DynamicShape<any>, context: undefined): Mapper<any, any> {
      return {
        read: a => a,
        write: a => a
      };
    }
    public binaryShape(shape: BinaryShape, context: undefined): Mapper<Buffer, string> {
      return {
        read: (b: any) => {
          if (typeof b !== 'string') {
            throw new Error(`expected base64 encoded string for Binary Payload`);
          }
          return Buffer.from(b, 'base64');
        },
        write: (b: Buffer) => b.toString('base64')
      };
    }
    public arrayShape(shape: ArrayShape<any>): Mapper<any[], any[]> {
      const item = mapper(shape.Items, {
        visitor: this
      });
      return {
        write: (arr: any[]) => arr.map(i => item.write(i)),
        read: (arr: any[]) => arr.map(i => item.read(i)),
      };
    }
    public boolShape(shape: BoolShape): Mapper<boolean, boolean> {
      return {
        read: (b: any) => {
          if (typeof b !== 'boolean') {
            throw new Error(`expected boolean but got ${typeof b}`);
          }
          return b;
        },
        write: (b: boolean) => b
      };
    }
    public recordShape(shape: RecordShape<any, any>): Mapper<any, any> {
      const fields = Object.entries(shape.Members)
        .map(([name, member]) => ({
          [name]: mapper(member.Shape, {
            visitor: this
          })
        }))
        .reduce((a, b) => ({...a, ...b}), {});

      return {
        read: (value: any) => {
          if (typeof value !== 'object') {
            throw new Error(`expected object but got ${typeof value}`);
          }
          const res: any = {};
          // TODO: optionals
          for (const [name, codec] of Object.entries(fields)) {
            res[name] = codec.read(value[name]);
          }
          return new shape.Type(res);
        },
        write: (value: any) => {
          const res: any = {};
          // TODO: optionals
          for (const [name, codec] of Object.entries(fields)) {
            res[name] = codec.write(value[name]);
          }
          return res;
        }
      };
    }
    public mapShape(shape: MapShape<any>): Mapper<{[key: string]: any}, {[key: string]: any}> {
      const valueMapper = mapper(shape.Items, {
        visitor: this
      });

      return {
        read: (map: any) => {
          if (typeof valueMapper !== 'object') {
            throw new Error(`expected object but got ${typeof valueMapper}`);
          }
          const res: any = {};
          // TODO: optionals
          for (const [name] of Object.entries(map)) {
            res[name] = valueMapper.read(map[name]);
          }
          return res;
        },
        write: (map: any) => {
          const res: any = {};
          // TODO: optionals
          for (const [name] of Object.entries(map)) {
            res[name] = valueMapper.write(map[name]);
          }
          return res;
        }
      } as any;
    }
    public numberShape(shape: NumberShape): Mapper<number, number> {
      return {
        read: (n: any) => {
          if (typeof n !== 'number') {
            throw new Error(`expected number but got ${typeof n}`);
          }
          return n;
        },
        write: (n: number) => n
      };
    }
    public integerShape(shape: IntegerShape): Mapper<number, number> {
      return {
        read: (n: any) => {
          if (typeof n !== 'number') {
            throw new Error(`expected number but got ${typeof n}`);
          }
          if (n % 1 !== 0) {
            throw new Error(`expected integer, got: ${n}`);
          }
          return n;
        },
        write: (n: number) => n
      };
    }

    public setShape(shape: SetShape<any>): Mapper<Set<any>, any[]> {
      const item = mapper(shape.Items, {
        visitor: this
      });
      return {
        write: (arr: Set<any>) => Array.from(arr).map(i => item.write(i)),
        read: (arr: any[]) => {
          const set =
            shape.Items.Kind === 'stringShape'  ||
            shape.Items.Kind === 'numberShape'  ||
            shape.Items.Kind === 'integerShape' ||
            shape.Items.Kind === 'boolShape' ? new Set() : new HashSet(shape.Items);
          arr.forEach(i => set.add(item.read(i)));
          return set;
        }
      };
    }
    public stringShape(shape: StringShape): Mapper<string, string> {
      return {
        read: (s: any) => {
          if (typeof s !== 'string') {
            throw new Error(`expected string but got ${typeof s}`);
          }
          return s;
        },
        write: (s: string) => s
      };
    }
    public timestampShape(shape: TimestampShape): Mapper<Date, string> {
      return {
        read: (d: any) => {
          if (typeof d !== 'string') {
            throw new Error(`expected string for timestamp, but got ${typeof d}`);
          }
          return new Date(Date.parse(d));
        },
        write: (d: Date) => d.toISOString()
      };
    }
  }
}
