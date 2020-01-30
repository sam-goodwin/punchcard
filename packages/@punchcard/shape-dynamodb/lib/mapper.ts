import AWS = require('aws-sdk');

import { ShapeOrRecord } from '@punchcard/shape/lib/class';
import { ShapeGuards } from '@punchcard/shape/lib/guards';
import { HashSet } from '@punchcard/shape/lib/hash-set';
import { ValidatingMapper } from '@punchcard/shape/lib/mapper';
import { Shape } from '@punchcard/shape/lib/shape';
import { Value } from '@punchcard/shape/lib/value';
import { AttributeValue } from './attribute';

export interface Mapper<T extends ShapeOrRecord> {
  read(value: AttributeValue.Of<T>): Value.Of<T>;
  write(value: Value.Of<T>): AttributeValue.Of<T>;
}

export namespace Mapper {
  export interface Options {
    validate: boolean;
    cache: WeakMap<any, any>;
  }

  export function of<T extends ShapeOrRecord>(type: T, options: Options = { validate: true, cache: new WeakMap() }): Mapper<T> {
    const shape = Shape.of(type);

    if (!options.cache.has(shape)) {
      let m = resolveShape();
      if (options.validate) {
        m = ValidatingMapper.of(type, m);
      }
      options.cache.set(shape, m);
    }
    return options.cache.get(shape);

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
          .map(m => ({ [m.Name]: Mapper.of(m.Shape, options) }))
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
        const writer = traverse((mapper, value) => {
          return (mapper as any).write(value);
        });

        return {
          read: (value: any) => {
            assertHasKey('M', value);
            return new shape.Type(reader(value.M));
          },
          write: (value: any) => {
            return { M: writer(value) };
          },
        } as any;
      } else if (ShapeGuards.isArrayShape(shape)) {
        const itemMapper: any = Mapper.of(shape.Items, options);

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
        if (ShapeGuards.isStringShape(shape.Items) || ShapeGuards.isNumberShape(shape.Items) || ShapeGuards.isBinaryShape(shape.Items)) {
          const key =
            ShapeGuards.isStringShape(shape.Items) ? 'SS' :
            ShapeGuards.isBinaryShape(shape.Items) ? 'BS' :
            'NS';

          const read =
            ShapeGuards.isStringShape(shape.Items) ? (s: any) => s as string :
            ShapeGuards.isBinaryShape(shape.Items) ? (b: any) => b as Buffer :
            (n: any) => parseFloat(n)
            ;

          const write =
            ShapeGuards.isStringShape(shape.Items) ? (s: string) => s :
            ShapeGuards.isBinaryShape(shape.Items) ? (b: Buffer) => b :
            (n: any) => n.toString()
            ;

          return {
            read: (value: any) => {
              assertHasKey(key, value);
              if (ShapeGuards.isBinaryShape(shape.Items)) {
                const s = new HashSet(shape.Items);
                value[key].forEach((v: any) => s.add(v));
                return s;
              }
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
        const valueMapper: any = Mapper.of(shape.Items, options);
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
            for (const [name, v] of Object.entries(value)) {
              result[name] = valueMapper.write(v);
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
      } else if (ShapeGuards.isDynamicShape(shape)) {
        return {
          read: AWS.DynamoDB.Converter.output,
          write: AWS.DynamoDB.Converter.input,
        };
      } else if (ShapeGuards.isBinaryShape(shape)) {
        return {
          read: (value: { B: Buffer }) => {
            assertHasKey('B', value);
            if (!Buffer.isBuffer(value.B)) {
              throw new Error(`expected { B: Buffer }, but got { B: ${typeof value.B} }`);
            }
            return value.B;
          },
          write: (B: Buffer) => {
            return {
              B
            };
          }
        } as any;
      } else {
        throw new Error(`Shape ${shape} is not supported by DynamoDB`);
      }
    }
  }
}