// tslint:disable-next-line: max-line-length
import { BaseDynamoPath, ConditionValue, DynamoPath, IndexParent, InferDynamoPathType, list_append, remove, RemoveAction, SetAction, UpdateValue } from '../dynamodb/expression/path';
import { Size } from '../dynamodb/expression/size';
import { InferJsonPathType, JsonPath } from './json/path';
import { Kind } from './kind';
import { RuntimeShape, Shape } from './shape';
import { ShapeVisitor } from './walker/visitor';

export function array<T extends Shape<any>>(itemType: T, constraints: ArrayShapeConstraints = {}): ArrayShape<T> {
  return new ArrayShape(itemType, constraints);
}

export interface ArrayShapeConstraints {
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}

export class ArrayShape<T extends Shape<any>> implements Shape<Array<RuntimeShape<T>>> {
  public readonly kind = Kind.Array;
  constructor(public readonly itemType: T, private readonly constraints?: ArrayShapeConstraints) {}

  public visit(visitor: ShapeVisitor) {
    visitor.array>?(this);
  }

  public validate(value: Array<RuntimeShape<T>>): void {
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
      const map: Map<number, Array<RuntimeShape<T>>> = new Map();
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

  public toDynamoPath(parent: DynamoPath, name: string): ArrayDynamoPath<T> {
    return new ArrayDynamoPath(parent, name, this);
  }

  public toJsonPath(parent: JsonPath<any>, name: string): ArrayPath<T> {
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

  public hashCode(value: Array<RuntimeShape<T>>): number {
    const prime = 31;
    let result = 1;
    value.forEach(item => result += prime * result + this.itemType.hashCode(item));
    return result;
  }

  public equals(a: Array<RuntimeShape<T>>, b: Array<RuntimeShape<T>>): boolean {
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

export class ArrayPath<T extends Shape<any>> extends JsonPath<ArrayShape<T>> {
  public readonly items: InferJsonPathType<T>;

  constructor(parent: JsonPath<any>, name: string, public readonly shape: ArrayShape<T>) {
    super(parent, name, shape);
    this.items = this.shape.itemType.toJsonPath(this, '[:0]') as InferJsonPathType<T>;
  }

  public get(index: number): InferJsonPathType<T> {
    return this.shape.itemType.toJsonPath(this, `[${index}]`) as InferJsonPathType<T>;
  }

  public slice(start: number, end: number, step?: number): InferJsonPathType<T> {
    return this.shape.itemType.toJsonPath(this, `[${start}:${end}${step === undefined ? '' : `:${step}`}]`) as InferJsonPathType<T>;
  }

  public map<P2 extends JsonPath<V2>, V2 extends Shape<any>>(fn: (item: InferJsonPathType<T>) => P2): P2 {
    return fn(this.items);
  }
}

/**
 * Represents a path to a List attribute.
 */
export class ArrayDynamoPath<T extends Shape<any>> extends BaseDynamoPath<ArrayShape<T>> {
  /**
   * Returns a value that represents the size of this array in DynamODB.
   */
  public get length(): Size {
    return new Size(this);
  }

  /**
   * Reference an element of this list.
   *
   * @param index position in the list to point to
   */
  public at(index: number): InferDynamoPathType<T> {
    return this.type.itemType.toDynamoPath(new IndexParent(this, index), index.toString()) as InferDynamoPathType<T>;
  }

  public insert(index: number, value: ConditionValue<T>): SetAction<T> {
    return ( this.at(index) as any).set(value);
  }

  public remove(index: number): RemoveAction<T> {
    return remove(( this.at(index) as any));
  }

  public append(values: UpdateValue<ArrayShape<T>>): SetAction<ArrayShape<T>> {
    return this.set(list_append(this.type, this, values));
  }

  public prepend(values: UpdateValue<ArrayShape<T>>): SetAction<ArrayShape<T>> {
    return this.set(list_append(this.type, values, this));
  }
}
