import {
  AnyShape,
  BinaryShape,
  BoolShape,
  DynamicShape,
  IntegerShape,
  NothingShape,
  NumberShape,
  NumericShape,
  StringShape,
  TimestampShape,
  UnknownShape,
} from "@punchcard/shape/lib/primitive";
import {ArrayShape, MapShape, SetShape} from "@punchcard/shape/lib/collection";
import {Mapper, ValidatingMapper} from "@punchcard/shape/lib/mapper";
import {RecordMembers, RecordShape} from "@punchcard/shape/lib/record";
import {HashSet} from "@punchcard/shape/lib/hash-set";
import {Shape} from "@punchcard/shape/lib/shape";
import {ShapeVisitor} from "@punchcard/shape/lib/visitor";
import {Value} from "@punchcard/shape/lib/value";

import {isOptional} from "@punchcard/shape/lib/traits";

export type Tag = typeof Tag;
export const Tag = Symbol.for("@punchcard/shape-json.Json.Tag");

export namespace Json {
  export type Of<T> = T extends RecordShape<infer M>
    ? {
        [m in keyof RecordMembers.Natural<M>]: Of<RecordMembers.Natural<M>[m]>;
      } // use the instance type if this type can be constructed (for class A extends Record({}) {}) // support overriding the type of a value
    : T extends AnyShape
    ? any
    : T extends BinaryShape
    ? string
    : T extends BoolShape
    ? boolean
    : T extends NothingShape
    ? undefined | null
    : T extends NumericShape
    ? number
    : T extends StringShape
    ? string
    : T extends TimestampShape
    ? Date
    : T extends UnknownShape
    ? unknown
    : T extends ArrayShape<infer I>
    ? Of<I>[]
    : T extends MapShape<infer V>
    ? {[key: string]: Of<V>}
    : T extends SetShape<infer I>
    ? Of<I>[]
    : T extends {[Tag]: infer V}
    ? V
    : never;
}

export namespace Json {
  export interface MapperOptions {
    validate?: boolean;
    visitor?: MapperVisitor;
  }

  export function mapper<T>(
    shape: T & Shape,
    options: MapperOptions = {},
  ): Mapper<Value.Of<T>, Json.Of<T>> {
    let mapper = (shape as any).visit(options.visitor || new MapperVisitor());
    if (options.validate === true) {
      mapper = ValidatingMapper.of(shape as any, mapper);
    }

    if (isOptional(shape)) {
      return {
        read: (v: any): Value.Of<T> => {
          if (v === undefined || v === undefined) {
            return v;
          }
          return mapper.read(v);
        },
        write: (v: any): Of<T> => {
          if (v === undefined || v === undefined) {
            return v;
          }
          return mapper.write(v);
        },
      };
    }

    return mapper;
  }

  export function asString<T, U>(mapper: Mapper<T, U>): Mapper<T, string> {
    return {
      read: (s): T => mapper.read(JSON.parse(s)),
      write: (v): string => JSON.stringify(mapper.write(v)),
    };
  }

  export function stringifyMapper<T extends Shape>(
    type: T,
    options: MapperOptions = {},
  ): Mapper<Value.Of<T>, string> {
    const m = mapper(type, options);
    return {
      read: (s: string): Value.Of<T> => m.read(JSON.parse(s)) as any,
      write: (v): string => JSON.stringify(m.write(v)),
    };
  }

  export function bufferMapper<T extends Shape>(
    type: T,
    options: MapperOptions = {},
  ): Mapper<Value.Of<T>, Buffer> {
    const m = mapper(type, options);
    return {
      read: (s: Buffer): Value.Of<T> =>
        m.read(JSON.parse(s.toString("utf8"))) as any,
      write: (v): Buffer => Buffer.from(JSON.stringify(m.write(v)), "utf8"),
    };
  }

  export class MapperVisitor implements ShapeVisitor<Mapper<any, any>> {
    public nothingShape(
      _shape: NothingShape,
      _context: undefined,
    ): Mapper<void, any> {
      return {
        // todo: get rid of `any` usage
        read: (a: any): void => {
          if (typeof a === "undefined" || a === undefined) {
            return undefined;
          }
          throw new Error(`expected null or undefined, got ${typeof a}, ${a}`);
        },
        write: (): undefined => undefined,
      };
    }
    public dynamicShape(
      _shape: DynamicShape<any>,
      _context: undefined,
    ): Mapper<any, any> {
      return {
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        read: (a) => a,
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        write: (a) => a,
      };
    }
    public binaryShape(
      _shape: BinaryShape,
      _context: undefined,
    ): Mapper<Buffer, string> {
      return {
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        read: (b: any) => {
          if (typeof b !== "string") {
            throw new TypeError(
              `expected base64 encoded string for Binary Payload`,
            );
          }
          return Buffer.from(b, "base64");
        },
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        write: (b: Buffer) => b.toString("base64"),
      };
    }
    public arrayShape(shape: ArrayShape<any>): Mapper<any[], any[]> {
      const item = mapper(shape.Items, {
        visitor: this,
      });
      return {
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        read: (arr: any[]) => arr.map((i) => item.read(i)),
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        write: (arr: any[]) => arr.map((i) => item.write(i)),
      };
    }
    public boolShape(_shape: BoolShape): Mapper<boolean, boolean> {
      return {
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        read: (b: any) => {
          if (typeof b !== "boolean") {
            throw new TypeError(`expected boolean but got ${typeof b}`);
          }
          return b;
        },
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        write: (b: boolean) => b,
      };
    }
    public recordShape(shape: RecordShape<any>): Mapper<any, any> {
      const fields = Object.entries(shape.Members)
        .map(([name, member]) => ({
          [name]: mapper(member as any, {
            visitor: this,
          }),
        }))
        .reduce((a, b) => ({...a, ...b}), {});

      return {
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        read: (value: any) => {
          if (typeof value !== "object") {
            throw new TypeError(`expected object but got ${typeof value}`);
          }
          const res: any = {};
          // TODO: optionals
          for (const [name, codec] of Object.entries(fields)) {
            res[name] = codec.read(value[name]);
          }
          return new (shape as any)(res);
        },
        write: (value: any) => {
          const res: any = {};
          // TODO: optionals
          for (const [name, codec] of Object.entries(fields)) {
            res[name] = codec.write(value[name]);
          }
          return res;
        },
      };
    }
    public mapShape(
      shape: MapShape<any>,
    ): Mapper<{[key: string]: any}, {[key: string]: any}> {
      const valueMapper = mapper(shape.Items, {
        visitor: this,
      });

      return {
        read: (map: any) => {
          if (typeof valueMapper !== "object") {
            throw new TypeError(
              `expected object but got ${typeof valueMapper}`,
            );
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
        },
      } as any;
    }
    public numberShape(_shape: NumberShape): Mapper<number, number> {
      return {
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        read: (n: any) => {
          if (typeof n !== "number") {
            throw new TypeError(`expected number but got ${typeof n}`);
          }
          return n;
        },
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        write: (n: number) => n,
      };
    }
    public integerShape(_shape: IntegerShape): Mapper<number, number> {
      return {
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        read: (n: any) => {
          if (typeof n !== "number") {
            throw new TypeError(`expected number but got ${typeof n}`);
          }
          if (n % 1 !== 0) {
            throw new Error(`expected integer, got: ${n}`);
          }
          return n;
        },
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        write: (n: number) => n,
      };
    }

    public setShape(shape: SetShape<any>): Mapper<Set<any>, any[]> {
      const item = mapper(shape.Items, {
        visitor: this,
      });
      return {
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        read: (arr: any[]) => {
          const set =
            shape.Items.Kind === "stringShape" ||
            shape.Items.Kind === "numberShape" ||
            shape.Items.Kind === "integerShape" ||
            shape.Items.Kind === "boolShape"
              ? new Set()
              : HashSet.of(shape.Items);
          arr.forEach((i) => set.add(item.read(i)));
          return set;
        },
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        write: (arr: Set<any>) => [...arr].map((i) => item.write(i)),
      };
    }
    public stringShape(_shape: StringShape): Mapper<string, string> {
      return {
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        read: (s: any) => {
          if (typeof s !== "string") {
            throw new TypeError(`expected string but got ${typeof s}`);
          }
          return s;
        },
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        write: (s: string) => s,
      };
    }
    public timestampShape(_shape: TimestampShape): Mapper<Date, string> {
      return {
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        read: (d: any) => {
          if (typeof d !== "string") {
            throw new TypeError(
              `expected string for timestamp, but got ${typeof d}`,
            );
          }
          return new Date(Date.parse(d));
        },
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        write: (d: Date) => d.toISOString(),
      };
    }
  }
}
