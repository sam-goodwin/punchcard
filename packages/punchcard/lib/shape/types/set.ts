import { AddAction, BaseDynamoPath, ConditionValue, Contains, DeleteAction, DynamoPath } from '../../dynamodb';
import { InferJsonPathType, JsonPath } from '../json/path';
import { RuntimeType } from '../shape';
import { Kind } from './kind';
import { Type } from './type';
import { TypeSet } from './typed-set';

export function set<T extends Type<any>>(itemType: T, constraints: SetTypeConstraints = {}): SetType<T> {
  return new SetType(itemType, constraints) as SetType<T>;
}

export interface SetTypeConstraints {
  minItems?: number;
  maxItems?: number;
}

export class SetType<T extends Type<any>> implements Type<Set<RuntimeType<T>>> {
  public readonly kind = Kind.Set;

  constructor(public readonly itemType: T, private readonly constraints?: SetTypeConstraints) {}

  public validate(value: Set<RuntimeType<T>>): void {
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

  public hashCode(value: Set<RuntimeType<T>>): number {
    const prime = 31;
    let result = 1;
    for (const item of value.values()) {
      result += prime * result + this.itemType.hashCode(item);
    }
    return result;
  }

  public equals(a: Set<RuntimeType<T>>, b: Set<RuntimeType<T>>): boolean {
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

export class SetPath<T extends Type<any>> extends JsonPath<Set<RuntimeType<T>>> {
  public readonly items: InferJsonPathType<T>;

  constructor(parent: JsonPath<any>, name: string, public readonly type: SetType<T>) {
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
 * Represents a path to a Set attribute (NumberSet, StringSet, BinarySet).
 */
export class SetDynamoPath<T extends Type<any>> extends BaseDynamoPath<SetType<T>> {
  public add(...values: Array<RuntimeType<T>>): AddAction<SetType<T>> {
    const s: Set<RuntimeType<T>> = TypeSet.forType(this.type.itemType);
    values.forEach(v => s.add(v));
    return new AddAction(this, s);
  }

  // public addAll(values: Set<V> | Array<RuntimeType<T>>): AddAction<T, Set<V>> {
  //   if (Array.isArray(values)) {
  //     return new AddAction(this, new Set(values));
  //   } else {
  //     return new AddAction(this, values);
  //   }
  // }

  public remove(...values: Array<RuntimeType<T>>): DeleteAction<T> {
    return new DeleteAction(this, new Set(values));
  }

  public removeAll(values: Set<RuntimeType<T>> | Array<RuntimeType<T>>): DeleteAction<T> {
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
