import { Kind } from "./kind";
import { Type } from "./type";

export interface TypeSet<T extends Type<V>, V> extends Set<V> {
  readonly itemType: T;
}
export namespace TypeSet {
  const primitives = [Kind.Boolean, Kind.Integer, Kind.Number, Kind.String];
  export const forType = <T extends Type<V>, V>(type: T): TypeSet<T, V> => {
    if (primitives.find(v => v === type.kind)) {
      return new PrimitiveSet(type);
    } else {
      return new GeneralSet(type);
    }
  };
}

class PrimitiveSet<T extends Type<V>, V> implements Set<V> {
  public [Symbol.toStringTag]: 'Set' = 'Set';
  public size: number = 0;

  private readonly delegate: Set<V> = new Set();

  constructor(public readonly itemType: T) {}

  public add(value: V): this {
    this.delegate.add(value);
    this.size = this.delegate.size;
    return this;
  }

  public has(value: V): boolean {
    return this.delegate.has(value);
  }

  public delete(value: V): boolean {
    const res = this.delegate.delete(value);
    this.size = this.delegate.size;
    return res;
  }

  public clear(): void {
    this.delegate.clear();
    this.size = 0;
  }

  public [Symbol.iterator](): IterableIterator<V> {
    return this.delegate[Symbol.iterator]();
  }

  public entries(): IterableIterator<[V, V]> {
    return this.delegate.entries();
  }

  public keys(): IterableIterator<V> {
    return this.delegate.keys();
  }

  public values(): IterableIterator<V> {
    return this.delegate.values();
  }

  public forEach(callbackfn: (value: V, value2: V, set: Set<V>) => void, thisArg?: any): void {
    this.delegate.forEach(callbackfn, thisArg);
  }
}

class GeneralSet<T extends Type<V>, V> implements Set<V> {
  public readonly [Symbol.toStringTag]: 'Set' = 'Set';

  public size: number = 0;

  private readonly map = new Map<number, V[]>();

  constructor(public readonly itemType: T) {}

  public add(value: V): this {
    const hashCode = this.itemType.hashCode(value);
    if (this.map.has(hashCode)) {
      const values = this.map.get(hashCode)!;
      if (values.find(v => this.itemType.equals(value, v)) === undefined) {
        values.push(value);
        this.size += 1;
      }
    } else {
      this.map.set(hashCode, [value]);
      this.size += 1;
    }
    return this;
  }

  public has(value: V): boolean {
    const hashCode = this.itemType.hashCode(value);
    return this.map.has(hashCode) && this.map.get(hashCode)!.find(v => this.itemType.equals(value, v)) !== undefined;
  }

  public delete(value: V): boolean {
    const hashCode = this.itemType.hashCode(value);
    if (this.map.has(hashCode)) {
      const arr = this.map.get(hashCode)!;
      for (let i = 0; i < arr.length; i++) {
        if (this.itemType.equals(value, arr[i])) {
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

  public *[Symbol.iterator](): IterableIterator<V> {
    for (const arr of this.map.values()) {
      for (const v of arr) {
        yield v;
      }
    }
  }

  public *entries(): IterableIterator<[V, V]> {
    for (const arr of this.map.values()) {
      for (const v of arr) {
        yield [v, v];
      }
    }
  }

  public keys(): IterableIterator<V> {
    return this[Symbol.iterator]();
  }

  public values(): IterableIterator<V> {
    return this[Symbol.iterator]();
  }

  public forEach(callbackfn: (value: V, value2: V, set: Set<V>) => void, thisArg?: any): void {
    for (const v of this.values()) {
      if (thisArg) {
        callbackfn.call(thisArg, v, v, this);
      } else {
        callbackfn(v, v, this);
      }
    }
  }
}