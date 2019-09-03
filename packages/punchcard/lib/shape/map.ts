import { BaseDynamoPath, ConditionValue, DynamoPath, InferDynamoPathType, MapKeyParent, remove, RemoveAction, SetAction } from '../dynamodb/expression/path';
import { hashCode } from './hash';
import { InferJsonPathType, JsonPath } from './json/path';
import { Kind } from './kind';
import { RuntimeShape, Shape } from './shape';

type RuntimeMap<T extends Shape<any>> = {[key: string]: RuntimeShape<T>};

export function map<T extends Shape<any>>(valueType: T, constraints?: MapShapeConstraints): MapShape<T> {
  return new MapShape(valueType, constraints) as MapShape<T>;
}

export interface MapShapeConstraints {
  minProperties?: number;
  maxProperties?: number;
}

export class MapShape<T extends Shape<any>> implements Shape<RuntimeMap<T>> {
  public readonly kind = Kind.Map;

  constructor(public readonly valueType: T, private readonly constraints?: MapShapeConstraints) {}

  public validate(value: RuntimeMap<T>): void {
    const len = Object.keys(value).length;
    if (this.constraints) {
      if (this.constraints.minProperties !== undefined && len < this.constraints.minProperties) {
        throw new Error(`map requires minProperties=${this.constraints.minProperties}, but contains ${len}`);
      }
      if (this.constraints.maxProperties !== undefined && len > this.constraints.maxProperties) {
        throw new Error(`map requires maxProperties=${this.constraints.minProperties}, but contains ${len}`);
      }
    }
    Object.keys(value).forEach(key => this.valueType.validate(value[key]));
  }

  public toDynamoPath(parent: DynamoPath, name: string): MapDynamoPath<T> {
    return new MapDynamoPath(parent, name, this);
  }

  public toJsonPath(parent: JsonPath<any>, name: string): MapPath<T> {
    return new MapPath(parent, name, this);
  }

  public toJsonSchema(): { [key: string]: any; } {
    const jsonSchema = {
      type: 'object',
      additionalProperties: this.valueType.toJsonSchema()
    };
    if (this.constraints) {
      return {
        ...jsonSchema,
        ...this.constraints
      };
    } else {
      return jsonSchema;
    }
  }

  public toGlueType() {
    return {
      inputString: `map<string,${this.valueType.toGlueType().inputString}>`,
      isPrimitive: false
    };
  }

  public hashCode(value: RuntimeMap<T>): number {
    const prime = 31;
    let result = 1;
    Object.keys(value).forEach(key => {
      result += prime * result + hashCode(key);
      result += prime * result + this.valueType.hashCode(value[key]);
    });
    return result;
  }

  public equals(a: RuntimeMap<T>, b: RuntimeMap<T>): boolean {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      return false;
    }
// tslint:disable-next-line: forin
    for (const aKey in aKeys) {
      const aValue = a[aKey];
      const bValue = b[aKey];
      if (bValue === undefined) {
        return false;
      }
      if (!this.valueType.equals(aValue, bValue)) {
        return false;
      }
    }
    return true;
  }
}

export class MapPath<T extends Shape<any>> extends JsonPath<MapShape<T>> {
  constructor(parent: JsonPath<any>, name: string, public readonly shape: MapShape<T>) {
    super(parent, name, shape);
  }

  public get(key: string): InferJsonPathType<T> {
    return this.shape.valueType.toJsonPath(this, `['${key}']`) as InferJsonPathType<T>;
  }
}

/**
 * Represents a path to a Map attribute.
 */
export class MapDynamoPath<T extends Shape<any>> extends BaseDynamoPath<MapShape<T>> {
  /**
   * Get a path to an attribute in the map by its name.
   *
   * @param key name of the attribute to point to
   */
  public get(key: string): InferDynamoPathType<T> {
    return this.type.valueType.toDynamoPath(new MapKeyParent(this, key), key) as InferDynamoPathType<T>;
  }

  public put(key: string, value: ConditionValue<T>): SetAction<T> {
    return (this.get(key) as any).set(value);
  }

  public remove(key: string): RemoveAction<T> {
    return remove(this.get(key) as any);
  }
}
