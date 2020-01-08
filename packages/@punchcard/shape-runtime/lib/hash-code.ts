import { ArrayShape, BoolShape, ClassShape, ClassType, MapShape, NumberShape, SetShape, Shape, StringShape, TimestampShape, Visitor as ShapeVisitor } from '@punchcard/shape';
import { Runtime } from './runtime';

/**
 * Computes the Hash Code for a runtime value of some Shape.
 */
export type HashCode<T extends Shape> = (value: Runtime.Of<T>) => number;

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

  export function hashCode(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const character = value.charCodeAt(i);
  // tslint:disable: no-bitwise
      hash = ((hash << 5) - hash) + character;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  export class Visitor implements ShapeVisitor<HashCode<any>> {
    public arrayShape(shape: ArrayShape<any>): HashCode<any> {
      const hashItem = of(shape.Items);

      return ((value: any[]) => {
        const prime = 31;
        let result = 1;
        value.forEach(v => result += prime * result + hashItem(v));
        return result;
      }) as any;
    }
    public boolShape(shape: BoolShape): HashCode<any> {
      return b => b ? 1 : 0;
    }
    public classShape(shape: ClassShape<any>): HashCode<any> {
      const fields = Object.entries(shape.Members)
        .map(([name, member]) => ({
          [name]: of(member.Type)
        }))
        .reduce((a, b, {}) => ({...a, ...b}));

      return ((value: any) => {
        const prime = 31;
        let result = 1;
        Object.keys(value).forEach(key => {
          result += prime * result + hashCode(key);
          result += prime * result + (fields[key])((value as any)[key]);
        });
        return result;
      }) as any;
    }
    public mapShape(shape: MapShape<any>): HashCode<any> {
      const hashValue = of(shape.Items);

      return ((value: any[]) => {
        const prime = 31;
        let result = 1;
        Object.keys(value).forEach((key: any) => {
          result += prime * result + hashCode(key);
          result += prime * result + hashValue(value[key]);
        });
        return result;
      }) as any;
    }
    public numberShape(shape: NumberShape): HashCode<any> {
      return n => n as number;
    }
    public setShape(shape: SetShape<any>): HashCode<any> {
      const hashItem = of(shape.Items);

      return ((v: Set<any>) => {
        const value = Array.from(v.entries());
        const prime = 31;
        let result = 1;
        value.forEach(v => result += prime * result + hashItem(v));
        return result;
      }) as any;
    }
    public stringShape(shape: StringShape): HashCode<any> {
      return s => hashCode(s as string);
    }
    public timestampShape(shape: TimestampShape): HashCode<any> {
      return (((a: Date, b: Date) => a.getTime() === b.getTime())) as any;
    }
  }

  export const visitor = new Visitor();
}
