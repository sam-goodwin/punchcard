import { BinaryShape, BoolShape, ClassShape, DynamicShape, IntegerShape, Meta, NumberShape, StringShape, TimestampShape, Visitor } from '@punchcard/shape';
import { ArrayShape, MapShape, SetShape } from '@punchcard/shape/lib/collection';
import { ArraySchema, MapSchema, SetSchema } from './collection';
import { JsonSchema } from './json-schema';
import { ObjectSchema } from './object';
import { AnySchema, BinarySchema, BoolSchema, IntegerSchema, NothingSchema, NumberSchema, StringSchema, TimestampSchema } from './primitive';

/**
 * Transforms a Shape into its corresponding JSON Schema representation.
 */
export class ToJsonSchemaVisitor implements Visitor<JsonSchema> {
  public dynamicShape(shape: DynamicShape<any>, context: undefined): AnySchema {
    return {
      type: {}
    };
  }
  public binaryShape(shape: BinaryShape, context: undefined): BinarySchema<any> {
    return {
      ...(Meta.get(shape, ['minLength', 'maxLength']) || {}),
      type: 'string',
      format: 'base64'
    } as any;
  }
  public boolShape(shape: BoolShape): BoolSchema {
    return {
      type: 'boolean'
    };
  }
  public stringShape(shape: StringShape): StringSchema {
    return {
      type: 'string',
      ...(Meta.get(shape, ['minLength', 'maxLength', 'pattern']) || {})
    } as any;
  }

  public timestampShape(shape: TimestampShape): TimestampSchema {
    return {
      type: 'string',
      format: 'date-time'
    };
  }

  public nothingShape(): NothingSchema {
    return {
      type: 'null'
    };
  }

  public numberShape(shape: NumberShape): NumberSchema {
    return {
      type: 'number',
      ...(Meta.get(shape, ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf']) || {})
    } as any;
  }

  public integerShape(shape: IntegerShape): IntegerSchema {
    return {
      type: 'integer',
      ...(Meta.get(shape, ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf']) || {})
    } as any;
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
    const required = Object.values(shape.Members)
      .map((value) => {
        return (value.Metadata as any).nullable === true ? [] : [value.Name];
      })
      .reduce((a, b) => a.concat(b), []);

    const schema: any = {
      type: 'object',
      properties: Object.entries(shape.Members)
        .map(([name, member]) => ({ [name]: (member as any).Shape.visit(this) }))
        .reduce((a, b) => ({...a, ...b}), {})
    };
    if (required.length > 0) {
      schema.required = required;
    }
    return schema;
  }
}
