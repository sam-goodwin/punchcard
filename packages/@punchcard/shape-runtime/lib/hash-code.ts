import { ArrayShape, BinaryShape, BoolShape, ClassShape, ClassType, DynamicShape, IntegerShape, MapShape, NothingShape, NumberShape, SetShape, Shape, StringShape, TimestampShape, Visitor as ShapeVisitor } from '@punchcard/shape';
import { Value } from './value';

/**
 * Computes the Hash Code for a runtime value of some Shape.
 */
export type HashCode<T extends Shape> = (value: Value.Of<T>) => number;

// tslint:disable: no-bitwise

export namespace HashCode {
  const cache = new WeakMap();

  export function of<T extends ClassType | Shape>(type: T, noCache: boolean = false): HashCode<Shape.Of<T>> {
    const shape = Shape.of(type);
    if (noCache) {
      return make();
    }
    if (!cache.has(type)) {
      cache.set(type, make());
    }
    return cache.get(type);

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
    public nothingShape(shape: NothingShape, context: undefined): HashCode<NothingShape> {
      return _ => 0;
    }
    public dynamicShape(shape: DynamicShape<any>): HashCode<DynamicShape<any>> {
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

    public binaryShape(shape: BinaryShape): HashCode<BinaryShape> {
      return ((value: Buffer) => {
        let hash = 0;
        for (const byte of value) {
          hash = ((hash << 5) - hash) + byte;
          hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
      }) as any;
    }
    public arrayShape(shape: ArrayShape<any>): HashCode<ArrayShape<any>> {
      const hashItem = of(shape.Items);

      return ((value: any[]) => {
        const prime = 31;
        let result = 1;
        value.forEach(v => result += prime * result + hashItem(v));
        return result;
      }) as any;
    }
    public boolShape(shape: BoolShape): HashCode<BoolShape> {
      return b => b ? 1 : 0;
    }
    public classShape(shape: ClassShape<any>): HashCode<ClassShape<any>> {
      const fields = Object.entries(shape.Members)
        .map(([name, member]) => ({
          [name]: of(member.Type)
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
    public mapShape(shape: MapShape<any>): HashCode<MapShape<any>> {
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
    public numberShape(shape: NumberShape): HashCode<NumberShape> {
      return n => n as number;
    }
    public integerShape(shape: IntegerShape): HashCode<IntegerShape> {
      return n => n as number;
    }
    public setShape(shape: SetShape<any>): HashCode<SetShape<any>> {
      const hashItem = of(shape.Items);

      return ((v: Set<any>) => {
        const value = Array.from(v.entries());
        const prime = 31;
        let result = 1;
        value.forEach(v => result += prime * result + hashItem(v));
        return result;
      }) as any;
    }
    public stringShape(shape: StringShape): HashCode<StringShape> {
      return s => stringHashCode(s as string);
    }
    public timestampShape(shape: TimestampShape): HashCode<TimestampShape> {
      return (((a: Date, b: Date) => a.getTime() === b.getTime())) as any;
    }
  }

  export const visitor = new Visitor();
}
