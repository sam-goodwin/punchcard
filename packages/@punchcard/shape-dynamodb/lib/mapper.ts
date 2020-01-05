import { Runtime } from '@punchcard/shape-runtime';
import { ClassType } from "@punchcard/shape/lib/class";
import { ShapeGuards } from '@punchcard/shape/lib/guards';
import { Shape } from "@punchcard/shape/lib/shape";
import { AttributeValue } from "./attribute";

export interface Mapper<T extends Shape> {
  read(value: AttributeValue.ValueOf<T>): Runtime.Of<T>;
  write(value: Runtime.Of<T>): AttributeValue.ValueOf<T>;
}

export interface Validator<T extends Shape> {
  validate(a: any): a is AttributeValue.ValueOf<T>;
}

export function mapper<T extends ClassType | Shape>(type: T, cache: WeakMap<any, any> = new WeakMap()): Mapper<Shape.Of<T>> {
  const shape = Shape.of(type);

  if (!cache.has(shape)) {
    cache.set(shape, resolveShape());
  }
  return cache.get(shape);

  function assertHasKey<K extends string>(key: K, value: any): value is {[k in K]: any } {
    if (value[key] === undefined) {
      new Error(`expected object with key '${key}' but received ${typeof value + ' ' + Object.keys(value).join(',')}`);
    }
    return true;
  }
  function assertIsType(type: string, value: any): boolean {
    if (typeof value !== type) {
      throw new Error(`expected type ${type}, but got: ${typeof value}`);
    }
    return true;
  }

  function resolveShape() {
    if (ShapeGuards.isClassShape(shape)) {
      const mappers: {[key: string]: Mapper<any>; } = Object.values(shape.Members)
        .map(m => ({ [m.Name]: mapper(m.Type) }))
        .reduce((a, b) => ({...a, ...b}));

      function traverse(f: (mapper: Mapper<any>, value: any) => any): (value: any) => any {
        return value => {
          const result: any = {};
          for (const [name, mapper] of Object.entries(mappers)) {
            result[name] = value[name] === undefined ? undefined : f(mapper as any, value[name]);
          }
          return result;
        };
      }

      const reader = traverse((mapper, value) => (mapper as any).read(value));
      const writer = traverse((mapper, value) => (mapper as any).write(value));

      return {
        read: (value: any) => {
          assertHasKey('M', value);
          return reader(value.M);
        },
        write: (value: any) => ({ M: writer(value) }),
      } as any;
    } else if (ShapeGuards.isArrayShape(shape)) {
      const itemMapper: any = mapper(shape.Items);

      return {
        read: (value: { L: any[] }) => {
          assertHasKey('L', value);
          return value.L.map(i => itemMapper.read(i));
        },
        write: (value: any[]) => ({
          L: value.map(i => itemMapper.write(i))
        })
      } as any;
    } else if (ShapeGuards.isSetShape(shape)) {
      if (ShapeGuards.isStringShape(shape.Items) || ShapeGuards.isNumberShape(shape.Items)) {
        const key = ShapeGuards.isStringShape(shape.Items) ? 'SS' : 'NS';

        const read = ShapeGuards.isStringShape(shape.Items)
          ? (s: any) => s as string
          : (n: any) => parseFloat(n)
          ;

        const write = ShapeGuards.isStringShape(shape.Items)
          ? (s: string) => s
          : (n: any) => n.toString()
          ;

        return {
          read: (value: any) => {
            assertHasKey(key, value);
            return new Set(value[key].map(read));
          },
          write: (value: Set<any>) => ({
            [key]: Array.from(value).map(write)
          })
        } as any;
      } else {
        throw new Error(`invalid DynamoDB set type: ${shape.Items}`);
      }
    } else if (ShapeGuards.isMapShape(shape)) {
      const valueMapper: any = mapper(shape.Items);
      return {
        read: (value: any) => {
          assertHasKey('M', value);
          const result: any = {};
          for (const [name, v] of Object.entries(value.M)) {
            result[name] = valueMapper.read(v);
          }
          return result;
        },
        write: (value: any) => {
          const result: any = {};
          for (const [name, v] of Object.entries(value.M)) {
            result[name] = valueMapper.read(v);
          }
          return {
            M: result
          };
        }
      } as any;
    } else if (ShapeGuards.isStringShape(shape)) {
      return {
        read: (value: { S: string }) => {
          assertHasKey('S', value);
          assertIsType('string', value.S);
          return value.S;
        },
        write: (value: string) => {
          assertIsType('string', value);
          return {
            S: value
          };
        }
      } as any;
    } else if (ShapeGuards.isNumberShape(shape)) {
      return {
        read: (value: { N: string }) => {
          assertHasKey('N', value);
          assertIsType('string', value.N);
          return parseFloat(value.N);
        },
        write: (value: number) => {
          assertIsType('number', value);
          return {
            N: value.toString(10)
          };
        }
      } as any;
    } else if (ShapeGuards.isTimestampShape(shape)) {
      // TODO: use moment-js?
      return {
        read: (value: { S: string }) => {
          assertHasKey('S', value);
          assertIsType('string', value.S);
          return new Date(Date.parse(value.S));
        },
        write: (value: Date) => {
          return {
            S: value.toISOString()
          };
        }
      } as any;
    } else {
      throw new Error(`Shape ${shape} is not supported by DynamoDB`);
    }
  }
}