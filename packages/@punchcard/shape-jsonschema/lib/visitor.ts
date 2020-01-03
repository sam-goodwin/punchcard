import { ClassShape, NumberShape, StringShape, Visitor } from "@punchcard/shape";
import { JsonSchema, NumberSchema, ObjectSchema, StringSchema } from "./json-schema";

export class ToJsonSchemaVisitor implements Visitor<JsonSchema> {
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
  public classShape(shape: ClassShape<any>): ObjectSchema<any> {
    return {
      type: 'object',
      properties: Object.entries(shape.Members).map(([name, member]) => ({
        [name]: (member as any).Type.visit(this)
      })).reduce((a, b) => ({...a, ...b}))
    };
  }
}