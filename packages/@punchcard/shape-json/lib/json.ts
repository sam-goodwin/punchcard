import { ClassType, OptionalKeys, RequiredKeys, Visitor as ShapeVisitor } from '@punchcard/shape';
import { HashSet, Runtime } from '@punchcard/shape-runtime';
import { ClassShape } from '@punchcard/shape/lib/class';
import { ArrayShape, MapShape, SetShape } from '@punchcard/shape/lib/collection';
import { BoolShape, NumberShape, StringShape, TimestampShape } from '@punchcard/shape/lib/primitive';
import { Shape } from '@punchcard/shape/lib/shape';

export namespace Json {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-json.Json.Tag');

  export type Of<T extends ClassType | Shape> =  Shape.Of<T> extends { [Tag]: infer J } ? J : never;

  const cache = new WeakMap();
  export function mapper<T extends ClassType | Shape>(type: T, noCache: boolean = false): Mapper<Shape.Of<T>> {
    if (noCache) {
      return make();
    }
    if (!cache.has(type)) {
      cache.set(type, make());
    }
    return cache.get(type);

    function make() {
      return (Shape.of(type) as any).visit(new SerializerVisitor());
    }
  }

  export interface Mapper<T extends Shape> {
    write(value: Runtime.Of<T>): Json.Of<T>;
    read(value: Json.Of<T>): Runtime.Of<T>;
  }

  export class SerializerVisitor implements ShapeVisitor<Mapper<any>> {
    public arrayShape(shape: ArrayShape<any>): Mapper<any> {
      const item = Json.mapper(shape.Items);
      return {
        write: (arr: any[]) => arr.map(i => item.write(i)),
        read: (arr: any[]) => arr.map(i => item.read(i)),
      };
    }
    public boolShape(shape: BoolShape): Mapper<any> {
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
    public classShape(shape: ClassShape<any>): Mapper<any> {
      const fields = Object.entries(shape.Members)
        .map(([name, member]) => ({
          [name]: mapper(member.Type)
        }))
        .reduce((a, b) => ({...a, ...b}));

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
          return res;
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
    public mapShape(shape: MapShape<any>): Mapper<any> {
      const valueMapper = mapper(shape.Items);

      return {
        read: (map: any) => {
          if (typeof valueMapper !== 'object') {
            throw new Error(`expected object but got ${typeof valueMapper}`);
          }
          const res: any = {};
          // TODO: optionals
          for (const [name, value] of Object.entries(map)) {
            res[name] = valueMapper.read(map[name]);
          }
          return res;
        },
        write: (map: any) => {
          const res: any = {};
          // TODO: optionals
          for (const [name, codec] of Object.entries(map)) {
            res[name] = valueMapper.write(map[name]);
          }
          return res;
        }
      } as any;
    }
    public numberShape(shape: NumberShape): Mapper<any> {
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
    public setShape(shape: SetShape<any>): Mapper<any> {
      const item = mapper(shape.Items);
      return {
        write: (arr: Set<any>) => Array.from(arr).map(i => item.write(i)),
        read: (arr: any[]) => {
          const set =
            shape.Items.Kind === 'stringShape' ||
            shape.Items.Kind === 'numberShape' ||
            shape.Items.Kind === 'boolShape' ? new Set() : new HashSet(shape.Items);
          arr.forEach(i => set.add(i));
          return set;
        }
      };
    }
    public stringShape(shape: StringShape): Mapper<any> {
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
    public timestampShape(shape: TimestampShape): Mapper<any> {
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

declare module '@punchcard/shape/lib/shape' {
  export interface Shape {
    [Json.Tag]: unknown;
  }
}
declare module '@punchcard/shape/lib/primitive' {
  export interface BoolShape {
    [Json.Tag]: boolean;
  }
  export interface NumberShape {
    [Json.Tag]: number;
  }
  export interface StringShape {
    [Json.Tag]: string;
  }
  export interface TimestampShape {
    [Json.Tag]: string;
  }
}

declare module '@punchcard/shape/lib/collection' {
  export interface ArrayShape<T extends Shape> {
    [Json.Tag]: Array<Json.Of<T>>;
  }
  export interface SetShape<T extends Shape> {
    [Json.Tag]: Array<Json.Of<T>>
  }
  export interface MapShape<T extends Shape> {
    [Json.Tag]: {
      [key: string]: Json.Of<T>;
    };
  }
}

declare module '@punchcard/shape/lib/class' {
  export interface ClassShape<C extends ClassType> {
    [Json.Tag]: {
      [member in RequiredKeys<this['Members']>]: this['Members'][member]['Type'][Json.Tag];
    } & {
      [member in OptionalKeys<this['Members']>]+?: this['Members'][member]['Type'][Json.Tag];
    }
;
  }
}
