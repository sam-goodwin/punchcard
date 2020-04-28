import { BinaryShape, BoolShape, DynamicShape, IntegerShape, isOptional, LiteralShape, Meta, NeverShape, NumberShape, RecordShape, Shape, ShapeGuards, ShapeVisitor, StringShape, TimestampShape, UnionShape } from '@punchcard/shape';
import { ArrayShape, MapShape, SetShape } from '@punchcard/shape/lib/collection';
import { FunctionArgs, FunctionShape } from '@punchcard/shape/lib/function';
import { AnySchema, ArraySchema, BinarySchema, BoolSchema, IntegerSchema, JsonSchema, MapSchema, NothingSchema, NumberSchema, ObjectSchema, SetSchema, StringSchema, TimestampSchema } from './json-schema';

/**
 * Transforms a Shape into its corresponding JSON Schema representation.
 */
export class ToJsonSchemaVisitor implements ShapeVisitor<JsonSchema, undefined> {
  public neverShape(shape: NeverShape, context: undefined): JsonSchema {
    throw new Error("JSON schema does not support never types");
  }
  public literalShape(shape: LiteralShape<Shape, any>, context: undefined): JsonSchema {
    throw new Error("Method not implemented.");
  }
  public unionShape(shape: UnionShape<Shape[]>, context: undefined): JsonSchema {
    const items = shape.Items.filter(i => !ShapeGuards.isNothingShape(i));
    if(items.length === 1) {
      return items[0].visit(this, context);
    }
    return {
      oneOf: shape.Items.map(s => s.visit(this, context))
    } as any;
  }
  public functionShape(shape: FunctionShape<FunctionArgs, Shape>): JsonSchema {
    throw new Error("JSON schema does not support function types");
  }
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

  public recordShape(shape: RecordShape<any>): ObjectSchema<any> {
    const required = (Object.entries(shape.Members) as [string, Shape][])
      .map(([name, member]) => {
        return isOptional(member) ? [] : [name];
      })
      .reduce((a, b) => a.concat(b), []);

    const schema: any = {
      type: 'object',
      properties: Object.entries(shape.Members)
        .map(([name, member]) => ({ [name]: (member as any).visit(this) }))
        .reduce((a, b) => ({...a, ...b}), {})
    };
    if (required.length > 0) {
      schema.required = required;
    }
    return schema;
  }
}
