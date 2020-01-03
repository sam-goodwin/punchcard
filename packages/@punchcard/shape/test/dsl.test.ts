import 'jest';
import { ClassShape, number, NumberShape, Shape, string, StringShape, Visitor, ClassType } from '../lib';

class ToJsonSchema implements Visitor {
  public stringShape(shape: StringShape): StringSchema {
    return {
      type: 'string'
    };
  }

  public numberShape(shape: NumberShape): NumberSchema {
    return {
      type: 'number'
    };
  }

  public classShape<T extends ClassShape<any>>(shape: T): Visitor.MapMembers<T, ToJsonSchema> {
    throw new Error("Method not implemented.");
  }
}

export type JsonSchema = StringSchema | TimestampSchema | TimestampSchema | ObjectSchema<any>;

export interface StringSchema {
  type: 'string';
  format?: string;
}
export interface NumberSchema {
  type: 'number';
  format?: string;
}
export interface TimestampSchema {
  type: 'string';
  format: 'date-time';
}
export interface ObjectSchema<P> {
  type: 'object';
  properties: P;
}

// tslint:disable: member-access
class MyType {
  id = string;
  count = number;
}

const myType: ClassShape<typeof MyType> = ClassShape.of(MyType);

const schema = myType.visit<ToJsonSchema>(new ToJsonSchema());


function visit<T extends ClassType>(shape: T): Visitor.Map<T, ToJsonSchema> {
  return null as any;
}

// schema.properties.

const members: Visitor.MapMembers<ClassShape<typeof MyType>, ToJsonSchema> = null as any;

const map: Visitor.Map<ClassShape<typeof MyType>, ToJsonSchema> = null as any;
const m = visit(MyType);
