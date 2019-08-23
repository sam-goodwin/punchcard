// tslint:disable-next-line: max-line-length
import { BaseDynamoPath, ConditionValue, DynamoPath, IndexParent, InferDynamoPathType, list_append, remove, RemoveAction, SetAction, UpdateValue } from '../../storage/dynamodb/expression/path';
import { InferJsonPathType, JsonPath } from '../json/path';
import { Kind } from './kind';
import { Type } from './type';

export function array<T extends Type<any>>(itemType: T, constraints: ArrayTypeConstraints = {}): MakeArrayType<T> {
  return new ArrayType(itemType, constraints) as MakeArrayType<T>;
}

type MakeArrayType<T extends Type<any>> = T extends Type<infer V> ? ArrayType<T, V> : never;

export interface ArrayTypeConstraints {
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}

export class ArrayType<T extends Type<V>, V> implements Type<V[]> {
  public readonly kind = Kind.Array;
  constructor(public readonly itemType: T, private readonly constraints?: ArrayTypeConstraints) {}

  public validate(value: V[]): void {
    value.forEach(v => this.itemType.validate(v));
    if (!this.constraints) {
      return;
    }
    if (this.constraints.minItems !== undefined && value.length < this.constraints.minItems) {
      throw new Error(`expected minItems=${this.constraints.minItems} but array contains ${value.length} items`);
    }
    if (this.constraints.maxItems !== undefined && value.length > this.constraints.maxItems) {
      throw new Error(`expected maxItems=${this.constraints.maxItems} but array contains ${value.length} items`);
    }
    if (this.constraints.uniqueItems) {
      const map: Map<number, V[]> = new Map();
      value.forEach(item => {
        const hashCode = this.itemType.hashCode(item);
        if (map.has(hashCode)) {
          const items = map.get(hashCode)!;
          if (items.find(i => this.itemType.equals(item, i)) !== null) {
            throw new Error('array contains duplicate items');
          }
          items.push(item);
        } else {
          map.set(hashCode, [item]);
        }
      });
    }
  }

  public toDynamoPath(parent: DynamoPath, name: string): ArrayDynamoPath<T, V> {
    return new ArrayDynamoPath(parent, name, this);
  }

  public toJsonPath(parent: JsonPath<any>, name: string): ArrayPath<T, V> {
    return new ArrayPath(parent, name, this);
  }

  public toJsonSchema(): { [key: string]: any; } {
    if (this.constraints) {
      return {
        type: 'array',
        items: this.itemType.toJsonSchema(),
        ...this.constraints
      };
    } else {
      return {
        type: 'array',
        items: this.itemType.toJsonSchema()
      };
    }
  }

  public toGlueType() {
    return {
      inputString: `array<${this.itemType.toGlueType().inputString}>`,
      isPrimitive: false
    };
  }

  public isInstance(a: any): a is V[] {
    return Array.isArray(a) && a.findIndex(item => !this.itemType.isInstance(item)) === -1;
  }

  public hashCode(value: V[]): number {
    const prime = 31;
    let result = 1;
    value.forEach(item => result += prime * result + this.itemType.hashCode(item));
    return result;
  }

  public equals(a: V[], b: V[]): boolean {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      const aValue = a[i];
      const bValue = b[i];
      if (!this.itemType.equals(aValue, bValue)) {
        return false;
      }
    }
    return true;
  }
}

export class ArrayPath<T extends Type<V>, V> extends JsonPath<V[]> {
  public readonly items: InferJsonPathType<T>;

  constructor(parent: JsonPath<any>, name: string, public readonly type: ArrayType<T, V>) {
    super(parent, name, type);
    this.items = this.type.itemType.toJsonPath(this, '[:0]') as InferJsonPathType<T>;
  }

  public get(index: number): InferJsonPathType<T> {
    return this.type.itemType.toJsonPath(this, `[${index}]`) as InferJsonPathType<T>;
  }

  public slice(start: number, end: number, step?: number): InferJsonPathType<T> {
    return this.type.itemType.toJsonPath(this, `[${start}:${end}${step === undefined ? '' : `:${step}`}]`) as InferJsonPathType<T>;
  }

  public map<P2 extends JsonPath<V2>, V2>(fn: (item: InferJsonPathType<T>) => P2): P2 {
    return fn(this.items);
  }
}

/**
 * Represents a path to a List attribute.
 */
export class ArrayDynamoPath<T extends Type<V>, V> extends BaseDynamoPath<ArrayType<T, V>, V[]> {
  /**
   * Get a path to an item in the list by position.
   *
   * @param index position in the list to point to
   */
  public get(index: number): InferDynamoPathType<T> {
    return this.type.itemType.toDynamoPath(new IndexParent(this, index), index.toString()) as InferDynamoPathType<T>;
  }

  public insert(index: number, value: ConditionValue<T, V>): SetAction<T, V> {
    return ( this.get(index) as any).set(value);
  }

  public remove(index: number): RemoveAction<T, V> {
    return remove(( this.get(index) as any));
  }

  public append(values: UpdateValue<ArrayType<T, V>, V[]>): SetAction<ArrayType<T, V>, V[]> {
    return this.set(list_append(this.type, this, values));
  }

  public prepend(values: UpdateValue<ArrayType<T, V>, V[]>): SetAction<ArrayType<T, V>, V[]> {
    return this.set(list_append(this.type, values, this));
  }
}
