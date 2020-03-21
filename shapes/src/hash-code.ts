import { ArrayShape, MapShape, SetShape } from './collection';
import { BinaryShape, BoolShape, DynamicShape, IntegerShape, NothingShape, NumberShape, StringShape, TimestampShape } from './primitive';
import { RecordShape} from './record';
import { Shape } from './shape';
import { Value } from './value';
import { ShapeVisitor } from './visitor';

/**
 * Computes the Hash Code for a runtime value of some Shape.
 */
export type HashCode<T> = (value: T) => number;

// tslint:disable: no-bitwise

export namespace HashCode {
  const cache = new WeakMap();

  export function of<T extends Shape>(shape: T, noCache: boolean = false): HashCode<Value.Of<T>> {
    if (noCache) {
      return make();
    }
    if (!cache.has(shape)) {
      cache.set(shape, make());
    }
    return cache.get(shape);

    function make() {
      return (shape as any).visit(visitor );
    }
  }

  export function stringHashCode(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const character = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + character;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  export class Visitor implements ShapeVisitor<HashCode<any>> {
    public nothingShape(_shape: NothingShape, _context: undefined): HashCode<any> {
      return _ => 0;
    }
    public dynamicShape(_shape: DynamicShape<any>): HashCode<any> {
      return hashCode;

      function hashCode(value: any) {
        switch (typeof value) {
          case 'string': return stringHashCode(value);
          case 'boolean': return value ? 1 : 0;
          case 'number': return value;
          case 'undefined': return 0;
          case 'object':
            if (Array.isArray(value)) {
              const prime = 31;
              let result = 1;
              value.forEach(item => result += prime * result + hashCode(item));
              return result;
            } else {
              const prime = 31;
              let result = 1;
              Object.keys(value).forEach(key => {
                result += prime * result + stringHashCode(key);
                result += prime * result + hashCode(value[key]);
              });
              return result;
            }
          default:
            throw new Error(`unsupported value in any type: '${typeof value}'`);
        }
      }
    }

    public binaryShape(_shape: BinaryShape): HashCode<any> {
      return ((value: Buffer) => {
        let hash = 0;
        for (const byte of value) {
          hash = ((hash << 5) - hash) + byte;
          hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
      }) as any;
    }
    public arrayShape(shape: ArrayShape<any>): HashCode<any> {
      const hashItem = of(shape.Items);

      return ((value: any[]) => {
        const prime = 31;
        let result = 1;
        value.forEach(v => result += prime * result + hashItem(v));
        return result;
      }) as any;
    }
    public boolShape(_shape: BoolShape): HashCode<any> {
      return b => b ? 1 : 0;
    }
    public mapShape(shape: MapShape<any>): HashCode<any> {
      const hashValue = of(shape.Items);

      return ((value: any[]) => {
        const prime = 31;
        let result = 1;
        Object.keys(value).forEach((key: any) => {
          result += prime * result + stringHashCode(key);
          result += prime * result + hashValue(value[key]);
        });
        return result;
      }) as any;
    }
    public numberShape(_shape: NumberShape): HashCode<any> {
      return n => n as number;
    }
    public integerShape(_shape: IntegerShape): HashCode<any> {
      return n => n as number;
    }
    public recordShape(shape: RecordShape<any>): HashCode<any> {
      const fields = Object.entries(shape.Members)
        .map(([name, member]) => ({
          [name]: of((member as any))
        }))
        .reduce((a, b, {}) => ({...a, ...b}));

      return ((value: any) => {
        const prime = 31;
        let result = 1;
        Object.keys(value).forEach(key => {
          result += prime * result + stringHashCode(key);
          result += prime * result + (fields[key])((value as any)[key]);
        });
        return result;
      }) as any;
    }
    public setShape(shape: SetShape<any>): HashCode<SetShape<any>> {
      const hashItem = of(shape.Items);

      return ((v: Set<any>) => {
        const value = Array.from(v.values());
        const prime = 31;
        let result = 1;
        value.forEach(v => result += prime * result + hashItem(v));
        return result;
      }) as any;
    }
    public stringShape(_shape: StringShape): HashCode<any> {
      return s => stringHashCode(s as string);
    }
    public timestampShape(_shape: TimestampShape): HashCode<any> {
      return (((a: Date, b: Date) => a.getTime() === b.getTime())) as any;
    }
  }

  export const visitor = new Visitor();
}
