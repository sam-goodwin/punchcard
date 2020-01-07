import { ArrayShape, BoolShape, ClassShape, ClassType, MapShape, NumberShape, SetShape, Shape, StringShape, TimestampShape, Visitor as ShapeVisitor } from '@punchcard/shape';
import { Runtime } from './runtime';

export type Equals<T extends Shape> = (a: Runtime.Of<T>, b: Runtime.Of<T>) => boolean;

export namespace Equals {
  const cache = new WeakMap();

  export function of<T extends ClassType | Shape>(type: T, noCache: boolean = false): Equals<Shape.Of<T>> {
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

  export class Visitor implements ShapeVisitor<Equals<any>> {
    public arrayShape(shape: ArrayShape<any>): Equals<any> {
      const itemEq = of(shape.Items);
      return ((a: any[], b: any[]) => {
        if (a.length !== b.length) {
          return false;
        }
        for (let i = 0; i < a.length; i++) {
          const aItem = a[i];
          const bItem = b[i];
          if (!itemEq(aItem, bItem)) {
            return false;
          }
        }
        return true;
      }) as any;
    }
    public boolShape(shape: BoolShape): Equals<any> {
      return (a, b) => a === b;
    }
    public classShape(shape: ClassShape<any>): Equals<any> {
      const fields = Object.entries(shape.Members)
        .map(([name, member]) => ({
          [name]: of(member.Type)
        }))
        .reduce((a, b) => ({...a, ...b}));

      return ((a: any, b: any) => {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) {
          return false;
        }
        for (const aKey of aKeys) {
          const aValue = (a as any)[aKey];
          const bValue = (b as any)[aKey];
          if (bValue === undefined) {
            return false;
          }
          if (!(fields as any)[aKey].equals(aValue, bValue)) {
            return false;
          }
        }
        return true;
      }) as any;
    }
    public mapShape(shape: MapShape<any>): Equals<any> {
      const valueEquals = of(shape.Items);

      return ((a: any, b: any) => {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) {
          return false;
        }
        for (const aKey of aKeys) {
          const aValue = a[aKey];
          const bValue = b[aKey];
          if (bValue === undefined) {
            return false;
          }
          if (!valueEquals(aValue, bValue)) {
            return false;
          }
        }
        return true;
      }) as any;
    }
    public numberShape(shape: NumberShape): Equals<any> {
      return (a, b) => a === b;
    }
    public setShape(shape: SetShape<any>): Equals<any> {
      return ((a: any, b: any) => {
        if (a.size !== b.size) {
          return false;
        }
        for (const v of a.values()) {
          if (!b.has(v)) {
            return false;
          }
        }
        return true;
      }) as any;
    }
    public stringShape(shape: StringShape): Equals<any> {
      return (a, b) => a === b;
    }
    public timestampShape(shape: TimestampShape): Equals<any> {
      return (((a: Date, b: Date) => a.getTime() === b.getTime())) as any;
    }
  }

  export const visitor = new Visitor();
}
