import { AddAction, BaseDynamoPath, ConditionValue, Contains, DeleteAction, DynamoPath } from '../dynamodb/expression/path';
import { JsonPath } from './json/path';
import { InferJsonPathType } from './json/path';
import { Kind } from './kind';
import { RuntimeShape, Shape } from './shape';
import { TypeSet } from './typed-set';

export function set<T extends Shape<any>>(itemType: T, constraints: SetShapeConstraints = {}): SetShape<T> {
  return new SetShape(itemType, constraints) as SetShape<T>;
}

export interface SetShapeConstraints {
  minItems?: number;
  maxItems?: number;
}

export class SetShape<T extends Shape<any>> implements Shape<Set<RuntimeShape<T>>> {
  public readonly kind = Kind.Set;

  constructor(public readonly itemType: T, private readonly constraints?: SetShapeConstraints) {}

  public validate(value: Set<RuntimeShape<T>>): void {
    value.forEach(v => this.itemType.validate(v));
    if (!this.constraints) {
      return;
    }
    if (this.constraints.minItems !== undefined && value.size < this.constraints.minItems) {
      throw new Error(`expected minItems=${this.constraints.minItems} but set contains ${value.size} items`);
    }
    if (this.constraints.maxItems !== undefined && value.size > this.constraints.maxItems) {
      throw new Error(`expected maxItems=${this.constraints.maxItems} but set contains ${value.size} items`);
    }
  }

  public toDynamoPath(parent: DynamoPath, name: string): SetDynamoPath<T> {
    return new SetDynamoPath(parent, name, this);
  }

  public toJsonPath(parent: JsonPath<any>, name: string): SetPath<T> {
    return new SetPath(parent, name, this);
  }

  public toJsonSchema(): { [key: string]: any; } {
    if (this.constraints) {
      return {
        type: 'array',
        items: this.itemType.toJsonSchema(),
        ...this.constraints,
        uniqueItems: true
      };
    } else {
      return {
        type: 'array',
        items: this.itemType.toJsonSchema(),
        uniqueItems: true
      };
    }
  }

  public toGlueType() {
    return {
      inputString: `array<${this.itemType.toGlueType().inputString}>`,
      isPrimitive: false
    };
  }

  public hashCode(value: Set<RuntimeShape<T>>): number {
    const prime = 31;
    let result = 1;
    for (const item of value.values()) {
      result += prime * result + this.itemType.hashCode(item);
    }
    return result;
  }

  public equals(a: Set<RuntimeShape<T>>, b: Set<RuntimeShape<T>>): boolean {
    if (a.size !== b.size) {
      return false;
    }
    for (const v of a.values()) {
      if (!b.has(v)) {
        return false;
      }
    }
    return true;
  }
}

export class SetPath<T extends Shape<any>> extends JsonPath<SetShape<T>> {
  public readonly items: InferJsonPathType<T>;

  constructor(parent: JsonPath<any>, name: string, public readonly shape: SetShape<T>) {
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
 * Represents a path to a Set attribute (NumberSet, StringSet, BinarySet).
 */
export class SetDynamoPath<T extends Shape<any>> extends BaseDynamoPath<SetShape<T>> {
  public add(...values: Array<RuntimeShape<T>>): AddAction<SetShape<T>> {
    const s: Set<RuntimeShape<T>> = TypeSet.forType(this.type.itemType);
    values.forEach(v => s.add(v));
    return new AddAction(this, s);
  }

  // public addAll(values: Set<V> | Array<RuntimeShape<T>>): AddAction<T, Set<V>> {
  //   if (Array.isArray(values)) {
  //     return new AddAction(this, new Set(values));
  //   } else {
  //     return new AddAction(this, values);
  //   }
  // }

  public remove(...values: Array<RuntimeShape<T>>): DeleteAction<T> {
    return new DeleteAction(this, new Set(values));
  }

  public removeAll(values: Set<RuntimeShape<T>> | Array<RuntimeShape<T>>): DeleteAction<T> {
    if (Array.isArray(values)) {
      return new DeleteAction(this, new Set(values));
    } else {
      return new DeleteAction(this, values);
    }
  }

  public contains(value: ConditionValue<T>): Contains<T> {
    return new Contains(this, this.type.itemType, value);
  }
}
