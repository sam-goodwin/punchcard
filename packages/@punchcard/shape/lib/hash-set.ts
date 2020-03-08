import { Equals } from './equals';
import { HashCode } from './hash-code';
import { ShapeOrRecord } from './record';
import { Shape } from './shape';
import { Value } from './value';

export class HashSet<T extends Shape> {
  public static of<T extends ShapeOrRecord>(t: T): HashSet<Shape.Of<T>> {
    return new HashSet(Shape.of(t)) as any;
  }

  public readonly [Symbol.toStringTag]: 'HashSet' = 'HashSet';

  public size: number = 0;

  private readonly map = new Map<number, Value.Of<T>[]>();

  private readonly itemEquals: Equals<T>;
  private readonly itemHashCode: HashCode<T>;

  constructor(public readonly itemType: T) {
    this.itemEquals = Equals.of(itemType) as Equals<T>;
    this.itemHashCode = HashCode.of(itemType) as HashCode<T>;
  }

  public add(value: Value.Of<T>): this {
    const hashCode = this.itemHashCode(value);
    if (this.map.has(hashCode)) {
      const values = this.map.get(hashCode)!;
      if (values.find(v => this.itemEquals(value, v) === undefined)) {
        values.push(value);
        this.size += 1;
      }
    } else {
      this.map.set(hashCode, [value]);
      this.size += 1;
    }
    return this;
  }

  public has(value: Value.Of<T>): boolean {
    const hashCode = this.itemHashCode(value);
    return this.map.has(hashCode) && this.map.get(hashCode)!.find(v => this.itemEquals(value, v)) !== undefined;
  }

  public delete(value: Value.Of<T>): boolean {
    const hashCode = this.itemHashCode(value);
    if (this.map.has(hashCode)) {
      const arr = this.map.get(hashCode)!;
      for (let i = 0; i < arr.length; i++) {
        if (this.itemEquals(value, arr[i])) {
          arr.splice(i, 1);
          this.size -= 1;
          return true;
        }
      }
    }
    return false;
  }

  public clear(): void {
    this.map.clear();
    this.size = 0;
  }

  public *[Symbol.iterator](): IterableIterator<Value.Of<T>> {
    for (const arr of this.map.values()) {
      for (const v of arr) {
        yield v;
      }
    }
  }

  public *entries(): IterableIterator<[Value.Of<T>, Value.Of<T>]> {
    for (const arr of this.map.values()) {
      for (const v of arr) {
        yield [v, v];
      }
    }
  }

  public keys(): IterableIterator<Value.Of<T>> {
    return this[Symbol.iterator]();
  }

  public values(): IterableIterator<Value.Of<T>> {
    return this[Symbol.iterator]();
  }

  public forEach(callbackfn: (value: Value.Of<T>, value2: Value.Of<T>, set: Set<Value.Of<T>>) => void, thisArg?: any): void {
    for (const v of this.values()) {
      if (thisArg) {
        callbackfn.call(thisArg, v, v, this);
      } else {
        callbackfn(v, v, this);
      }
    }
  }
}