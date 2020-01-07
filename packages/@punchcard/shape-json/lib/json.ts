import { ClassType, Visitor as ShapeVisitor } from '@punchcard/shape';
import { Runtime, ShapeSet } from '@punchcard/shape-runtime';
import { ClassShape } from '@punchcard/shape/lib/class';
import { ArrayShape, MapShape, SetShape } from '@punchcard/shape/lib/collection';
import { BoolShape, NumberShape, StringShape, TimestampShape } from '@punchcard/shape/lib/primitive';
import { Shape } from '@punchcard/shape/lib/shape';

export namespace Json {
  export type Tag = typeof Tag;
  export const Tag = Symbol.for('@punchcard/shape-json.Json.Tag');

  export type Of<T extends ClassType | Shape> =  Shape.Of<T> extends { [Tag]: infer J } ? J : never;

  const cache = new WeakMap();
  export function codec<T extends ClassType | Shape>(type: T, noCache: boolean = false): Codec<Shape.Of<T>> {
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

  export interface Codec<T extends Shape> {
    write(value: Runtime.Of<T>): Json.Of<T>;
    read(value: Json.Of<T>): Runtime.Of<T>;
  }

  export class SerializerVisitor implements ShapeVisitor<Codec<any>> {
    public arrayShape(shape: ArrayShape<any>): Codec<any> {
      const item = codec(shape.Items);
      return {
        write: (arr: any[]) => arr.map(i => item.write(i)),
        read: (arr: any[]) => arr.map(i => item.read(i)),
      };
    }
    public boolShape(shape: BoolShape): Codec<any> {
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
    public classShape(shape: ClassShape<any>): Codec<any> {
      const fields = Object.entries(shape.Members)
        .map(([name, member]) => ({
          [name]: codec(member.Type)
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
    public mapShape(shape: MapShape<any>): Codec<any> {
      throw new Error("Method not implemented.");
    }
    public numberShape(shape: NumberShape): Codec<any> {
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
    public setShape(shape: SetShape<any>): Codec<any> {
      const item = codec(shape.Items);
      return {
        write: (arr: Set<any>) => Array.from(arr).map(i => item.write(i)),
        read: (arr: any[]) => {
          const s = ShapeSet.forType(shape);
          arr.forEach(i => s.add(i));
          return s;
        }
      };
    }
    public stringShape(shape: StringShape): Codec<any> {
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
    public timestampShape(shape: TimestampShape): Codec<any> {
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
    [Json.Tag]: number;
  }
  export interface NumberShape {
    [Json.Tag]: number;
  }
  export interface StringShape {
    [Json.Tag]: string;
  }
}

declare module '@punchcard/shape/lib/collection' {
  export interface ArrayShape<T extends Shape> {
    [Json.Tag]: Array<Json.Of<T>>;
  }
  export interface SetShape<T extends Shape> {
    [Json.Tag]: Set<Json.Of<T>>
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
      [member in keyof this['Members']]: Json.Of<this['Members'][member]['Type']>;
    };
  }
}
