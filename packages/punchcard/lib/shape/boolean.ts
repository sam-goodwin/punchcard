import { BaseDynamoPath, DynamoPath } from '../dynamodb/expression/path';
import { Kind } from './kind';
import { PrimitiveShape } from './primitive';

export class BooleanShape extends PrimitiveShape<boolean> {
  constructor() { super(Kind.Boolean); }

  public validate(value: boolean): void {
    // no-op
  }

  public toDynamoPath(parent: DynamoPath, name: string): BaseDynamoPath<this> {
    return new BaseDynamoPath(parent, name, this);
  }

  public toJsonSchema(): { [key: string]: any; } {
    return { type: 'boolean' };
  }

  public toGlueType() {
    return {
      inputString: 'boolean',
      isPrimitive: true
    };
  }

  public hashCode(value: boolean): number {
    return value ? 1 : 0;
  }
}
// tslint:disable-next-line: variable-name
export const boolean = new BooleanShape();
