import { ArrayShape, MapShape, SetShape } from './collection';
import { BinaryShape, BoolShape, DynamicShape, IntegerShape, NothingShape, NumberShape, StringShape, TimestampShape } from './primitive';
import { RecordShape } from './record';
import { Shape } from './shape';
import { Value } from './value';
import { ShapeVisitor } from './visitor';

/**
 * Computes whether two Values of a Shape are equal.
 */
export type Equals<T> = (a: T, b: T) => boolean;

export namespace Equals {
  const cache = new WeakMap();

  export function of<T extends Shape>(shape: T, noCache: boolean = false): Equals<Value.Of<T>> {
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

  export class Visitor implements ShapeVisitor<Equals<any>> {
    public nothingShape(shape: NothingShape, context: undefined): Equals<NothingShape> {
      return (a, b) => a === b && a === undefined;
    }
    public dynamicShape(shape: DynamicShape<any>, context: undefined): Equals<DynamicShape<any>> {
      return function equals(a: any, b: any): boolean {
        const type = typeof a;
        if (type !== typeof b) {
          return false;
        }
        switch (type) {
          case 'undefined': return true;
          case 'string':
          case 'number':
          case 'bigint':
          case 'boolean':
            return a === b;
          case 'object':
            if (Array.isArray(a) && Array.isArray(b)) {
              if (a.length !== b.length) {
                return false;
              }
              for (let i = 0; i < a.length; i++) {
                if (!equals(a[i], b[i])) {
                  return false;
                }
              }
              return true;
            } else if (Array.isArray(a) || Array.isArray(b)) {
              return false;
            }
            const aKeys = Object.keys(a);
            const bKeys = new Set(Object.keys(b));
            if (aKeys.length !== bKeys.size) {
              return false;
            }
            for (const k of aKeys) {
              if (!bKeys.has(k)) {
                return false;
              }
              if (!equals(a[k], b[k])) {
                return false;
              }
            }
            return true;
          default:
            throw new Error(`unsupported value in any type: '${type}'`);
        }
      };
    }
    public binaryShape(shape: BinaryShape, context: undefined): Equals<BinaryShape> {
      return ((a: Buffer, b: Buffer) => {
        if (a.length !== b.length) {
          return false;
        }
        for (let i = 0; i < a.length; i++) {
          if (a.readUInt8(i) !== b.readUInt8(i)) {
            return false;
          }
        }
        return true;
      }) as any;
    }
    public arrayShape(shape: ArrayShape<any>): Equals<ArrayShape<any>> {
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
    public boolShape(shape: BoolShape): Equals<BoolShape> {
      return (a, b) => a === b;
    }
    public recordShape(shape: RecordShape<any>): Equals<RecordShape<any>> {
      const fields = Object.entries(shape.Members)
        .map(([name, member]) => ({
          [name]: of((member as any))
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
          if (aValue === undefined && bValue === undefined) {
            return false;
          }

          if (!(fields as any)[aKey](aValue, bValue)) {
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
    public numberShape(shape: NumberShape): Equals<NumberShape> {
      return (a, b) => a === b;
    }
    public integerShape(shape: IntegerShape): Equals<IntegerShape> {
      return (a, b) => a === b;
    }
    public setShape(shape: SetShape<any>): Equals<SetShape<any>> {
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
    public stringShape(shape: StringShape): Equals<StringShape> {
      return (a, b) => a === b;
    }
    public timestampShape(shape: TimestampShape): Equals<TimestampShape> {
      return (((a: Date, b: Date) => a.getTime() === b.getTime())) as any;
    }
  }

  export const visitor = new Visitor();
}
