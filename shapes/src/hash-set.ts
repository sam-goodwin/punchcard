import {Equals} from "./equals";
import {HashCode} from "./hash-code";
import {Shape} from "./shape";
import {Value} from "./value";

export class HashSet<T> {
  public static of<T extends Shape>(t: T): HashSet<Value.Of<T>> {
    return new HashSet(t);
  }

  public readonly [Symbol.toStringTag]: "HashSet" = "HashSet";

  public size = 0;

  private readonly map = new Map<number, T[]>();

  private readonly itemEquals: Equals<T>;
  private readonly itemHashCode: HashCode<T>;

  private constructor(public readonly itemType: Shape) {
    this.itemEquals = Equals.of(itemType);
    this.itemHashCode = HashCode.of(itemType);
  }

  public add(value: T): this {
    const hashCode = this.itemHashCode(value);
    if (this.map.has(hashCode)) {
      const values = this.map.get(hashCode)!;
      if (values.find((v) => this.itemEquals(value, v) === undefined)) {
        values.push(value);
        this.size += 1;
      }
    } else {
      this.map.set(hashCode, [value]);
      this.size += 1;
    }
    return this;
  }

  public has(value: T): boolean {
    const hashCode = this.itemHashCode(value);
    return (
      this.map.has(hashCode) &&
      this.map.get(hashCode)!.find((v) => this.itemEquals(value, v)) !==
        undefined
    );
  }

  public delete(value: T): boolean {
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

  public *[Symbol.iterator](): IterableIterator<T> {
    for (const arr of this.map.values()) {
      for (const v of arr) {
        yield v;
      }
    }
  }

  public *entries(): IterableIterator<[T, T]> {
    for (const arr of this.map.values()) {
      for (const v of arr) {
        yield [v, v];
      }
    }
  }

  public keys(): IterableIterator<T> {
    return this[Symbol.iterator]();
  }

  public values(): IterableIterator<T> {
    return this[Symbol.iterator]();
  }

  public forEach(
    callbackfn: (value: T, value2: T, set: Set<T>) => void,
    thisArg?: any,
  ): void {
    for (const v of this.values()) {
      if (thisArg) {
        callbackfn.call(thisArg, v, v, this);
      } else {
        callbackfn(v, v, this);
      }
    }
  }
}
