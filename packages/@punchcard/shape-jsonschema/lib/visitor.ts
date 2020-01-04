import { ClassShape, NumberShape, StringShape, TimestampShape, Visitor } from '@punchcard/shape';
import { ArrayShape, MapShape, SetShape } from '@punchcard/shape/lib/collection';
import { ObjectSchema } from './class';
import { ArraySchema, MapSchema, SetSchema } from './collection';
import { JsonSchema } from './json-schema';
import { NumberSchema, StringSchema, TimestampSchema } from './primitive';

export class ToJsonSchemaVisitor implements Visitor<JsonSchema> {
  public stringShape(shape: StringShape): StringSchema {
    return {
      type: 'string'
    };
  }

  public timestampShape(shape: TimestampShape): TimestampSchema {
    return {
      type: 'string',
      format: 'date-time'
    };
  }

  public numberShape(shape: NumberShape): NumberSchema {
    return {
      type: 'number'
    };
  }

  public arrayShape(shape: ArrayShape<any>): ArraySchema {
    return {
      type: 'array',
      uniqueItems: false,
      items: shape.Items.visit(this)
    };
  }

  public setShape(shape: SetShape<any>): SetSchema {
    return {
      type: 'array',
      uniqueItems: true,
      items: shape.Items.visit(this)
    };
  }

  public mapShape(shape: MapShape<any>): MapSchema {
    return {
      type: 'object',
      properties: {}, // TODO: null or empty object?
      additionalProperties: shape.Items.visit(this),
      allowAdditionalProperties: true,
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