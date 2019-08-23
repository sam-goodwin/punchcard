import { BaseDynamoPath, DynamoPath } from '../../storage/dynamodb/expression/path';
import { Kind } from './kind';
import { PrimitiveType } from './primitive';
import { Type } from './type';

export class BooleanType extends PrimitiveType<boolean> {
  constructor() { super(Kind.Boolean); }

  public validate(value: boolean): boolean {
    return value;
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
export const boolean = new BooleanType();
